const express = require("express");
const fs = require("fs/promises");
const multer = require("multer");
const path = require("path");

const {
  createTenderJob,
  getTenderJob,
  listTenderJobs,
  updateTenderJob,
} = require("../store/tenderJobStore");
const { runTenderScan } = require("../services/tender/tenderScanner");
const { answerTenderQuestion } = require("../services/tender/tenderChat");
const { syncTenderSourceFiles } = require("../services/tender/sourceFileStorage");
const { streamTenderSourceZip } = require("../services/tender/zipTenderSourceFiles");

const router = express.Router();
const workspaceRoot = path.resolve(__dirname, "..", "..");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 500,
    fileSize: 20 * 1024 * 1024,
  },
});

router.get("/", (_req, res) => {
  res.json({
    jobs: listTenderJobs(),
  });
});

router.get("/:jobId", (req, res, next) => {
  try {
    const job = requireTenderJob(req.params.jobId);
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.get("/:jobId/documents", async (req, res, next) => {
  try {
    const job = requireTenderJob(req.params.jobId);
    const documentsPath = job.resultFiles?.documentsJsonPath;
    const skippedPath = job.resultFiles?.skippedPath;

    if (!documentsPath) {
      return res.json({
        job,
        documents: [],
        skippedDocuments: [],
      });
    }

    const resolved = path.resolve(documentsPath);
    const outputRoot = path.resolve(job.outputDirectory || "");

    if (!outputRoot || !resolved.startsWith(outputRoot)) {
      return res.status(403).json({ success: false, message: "Requested file is outside the job output folder." });
    }

    const content = await fs.readFile(resolved, "utf8");
    const documents = JSON.parse(content || "[]");
    const skippedDocuments = skippedPath ? await readJobOutputJson(job, skippedPath, []) : [];

    return res.json({
      job,
      documents,
      skippedDocuments,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:jobId/source-files", async (req, res, next) => {
  try {
    const job = requireTenderJob(req.params.jobId);
    let sourceFiles = Array.isArray(job.sourceFiles) ? job.sourceFiles : [];

    if (sourceFiles.length === 0 && job.sourceDirectory) {
      sourceFiles = await syncTenderSourceFiles(job.id);
    }

    res.json({
      job: requireTenderJob(job.id),
      sourceFiles,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:jobId/source-files.zip", async (req, res, next) => {
  try {
    const job = requireTenderJob(req.params.jobId);
    if (!job.sourceDirectory) {
      return res.status(404).json({ success: false, message: "Source files are not available for this tender job." });
    }

    const outputName = `${sanitizeFileName(job.id)}-source-files.zip`;
    await streamTenderSourceZip({
      sourceDirectory: job.sourceDirectory,
      outputName,
      res,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:jobId/documents/:docIndex/chat", express.json(), async (req, res, next) => {
  try {
    const job = requireTenderJob(req.params.jobId);
    const documents = await readTenderDocuments(job);
    const docIndex = Number(req.params.docIndex);
    const document = documents[docIndex];
    const question = String(req.body?.question || "").trim();

    if (!Number.isInteger(docIndex) || docIndex < 0 || !document) {
      return res.status(404).json({ success: false, message: "Tender analysis record not found." });
    }

    if (!question) {
      return res.status(400).json({ success: false, message: "question is required." });
    }

    const answer = await answerTenderQuestion({
      documents,
      selectedDocument: document,
      question,
    });

    return res.json({
      success: true,
      answer,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", upload.array("files", 500), async (req, res, next) => {
  try {
    const payload = normalizeTenderJobPayload(req.body, req.files);
    const job = createTenderJob(payload);

    if (Array.isArray(req.files) && req.files.length > 0) {
      const sourceDirectory = path.join(workspaceRoot, "Translator", "uploads", "tender-jobs", job.id);
      await persistTenderUploads(req.files, sourceDirectory, req.body?.fileRelativePaths);
      updateTenderJob(job.id, {
        sourceDirectory,
        uploadCount: req.files.length,
      });
    }

    syncTenderSourceFiles(job.id).catch((error) => {
      updateTenderJob(job.id, {
        sourceFilesError: error.message,
      });
    });

    runTenderScan(job.id).catch((error) => {
      updateTenderJob(job.id, {
        status: "FAILED",
        currentFile: null,
        error: error.message,
      });
    });

    res.status(201).json(requireTenderJob(job.id));
  } catch (error) {
    next(error);
  }
});

router.get("/:jobId/file", async (req, res, next) => {
  try {
    const job = requireTenderJob(req.params.jobId);
    const requestedPath = String(req.query.path || "").trim();

    if (!requestedPath) {
      return res.status(400).json({ success: false, message: "path query parameter is required." });
    }

    const resolved = path.resolve(requestedPath);
    const outputRoot = path.resolve(job.outputDirectory || "");

    if (!outputRoot || !resolved.startsWith(outputRoot)) {
      return res.status(403).json({ success: false, message: "Requested file is outside the job output folder." });
    }

    await fs.access(resolved);
    return res.download(resolved);
  } catch (error) {
    next(error);
  }
});

function normalizeTenderJobPayload(body, files) {
  const fileList = Array.isArray(files) ? files : [];
  const sourceDirectoryInput = String(body.directoryPath || "").trim();
  const outputDirectoryInput = String(body.outputDirectory || "").trim();
  const sourceDirectory = sourceDirectoryInput ? resolveWorkspacePath(sourceDirectoryInput) : "";
  const outputDirectory = outputDirectoryInput
    ? resolveWorkspacePath(outputDirectoryInput)
    : path.join(workspaceRoot, "Translator", "tender-output", new Date().toISOString().replaceAll(":", "-"));

  if (!sourceDirectory && fileList.length === 0) {
    throw badRequest("directoryPath or uploaded files are required");
  }

  return {
    sourceDirectory,
    outputDirectory,
    uploadCount: fileList.length,
  };
}

function requireTenderJob(jobId) {
  const job = getTenderJob(jobId);
  if (!job) {
    throw notFound(`Tender job ${jobId} was not found`);
  }

  return job;
}

async function readTenderDocuments(job) {
  const documentsPath = job.resultFiles?.documentsJsonPath;
  if (!documentsPath) {
    return [];
  }

  return readJobOutputJson(job, documentsPath, []);
}

async function readJobOutputJson(job, filePath, fallback) {
  const resolved = path.resolve(filePath);
  const outputRoot = path.resolve(job.outputDirectory || "");

  if (!outputRoot || !resolved.startsWith(outputRoot)) {
    throw badRequest("Requested file is outside the job output folder.");
  }

  const content = await fs.readFile(resolved, "utf8");
  return JSON.parse(content || "null") ?? fallback;
}

async function persistTenderUploads(files, targetDirectory, relativePathsInput) {
  await fs.mkdir(targetDirectory, { recursive: true });
  const relativePaths = normalizeUploadRelativePaths(relativePathsInput);

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const relativePath = buildUploadRelativePath(file, relativePaths[index], index);
    const destination = path.join(targetDirectory, relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.buffer);
  }
}

function resolveWorkspacePath(targetPath) {
  return path.isAbsolute(targetPath)
    ? path.normalize(targetPath)
    : path.resolve(workspaceRoot, targetPath);
}

function sanitizeFileName(value) {
  return path
    .basename(String(value || "file"))
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUploadRelativePaths(input) {
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === "string" && input.trim()) {
    return [input];
  }
  return [];
}

function buildUploadRelativePath(file, relativePathInput, index) {
  const candidate = String(relativePathInput || file.originalname || "").trim();
  const normalized = candidate.replaceAll("\\", "/");
  const parts = normalized
    .split("/")
    .map((part) => sanitizePathSegment(part))
    .filter(Boolean);
  const fileName = sanitizeFileName(file.originalname || parts[parts.length - 1] || `file-${index + 1}`);
  const finalFileName = `${String(index + 1).padStart(4, "0")}-${fileName}`;

  if (parts.length <= 1) {
    return finalFileName;
  }

  return path.join(...parts.slice(0, -1), finalFileName);
}

function sanitizePathSegment(value) {
  const segment = String(value || "").trim();
  if (!segment || segment === "." || segment === "..") {
    return "";
  }

  return segment
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

module.exports = router;
