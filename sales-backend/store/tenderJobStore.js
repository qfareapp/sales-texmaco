const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "..", "..");
const tenderOutputRoot = path.join(workspaceRoot, "Translator", "tender-output");
const storeFilePath = path.join(tenderOutputRoot, "tender-jobs-store.json");
const jobs = new Map();

loadJobs();

function listTenderJobs() {
  return Array.from(jobs.values()).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function createTenderJob(payload) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const job = {
    id,
    status: "CREATED",
    sourceDirectory: "",
    outputDirectory: "",
    totalFiles: 0,
    processedFiles: 0,
    tenderFiles: 0,
    skippedFiles: 0,
    currentFile: null,
    error: null,
    summary: null,
    resultFiles: null,
    sourceFiles: [],
    uploadCount: 0,
    createdAt: now,
    updatedAt: now,
    ...payload,
  };

  jobs.set(id, job);
  persistJobs();
  return job;
}

function getTenderJob(id) {
  return jobs.get(id) || null;
}

function updateTenderJob(id, patch) {
  const existing = getTenderJob(id);
  if (!existing) {
    return null;
  }

  const next = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, next);
  persistJobs();
  return next;
}

function loadJobs() {
  try {
    ensureStoreDir();

    if (fs.existsSync(storeFilePath)) {
      const content = fs.readFileSync(storeFilePath, "utf8");
      const parsed = JSON.parse(content || "[]");
      parsed.forEach((job) => {
        if (job?.id) {
          jobs.set(job.id, job);
        }
      });
      return;
    }

    recoverJobsFromOutputFolders();
    persistJobs();
  } catch (error) {
    console.error("Failed to load tender job store:", error.message);
  }
}

function persistJobs() {
  try {
    ensureStoreDir();
    fs.writeFileSync(storeFilePath, JSON.stringify(listTenderJobs(), null, 2));
  } catch (error) {
    console.error("Failed to persist tender job store:", error.message);
  }
}

function ensureStoreDir() {
  fs.mkdirSync(tenderOutputRoot, { recursive: true });
}

function recoverJobsFromOutputFolders() {
  if (!fs.existsSync(tenderOutputRoot)) {
    return;
  }

  const entries = fs
    .readdirSync(tenderOutputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const entry of entries) {
    const outputDirectory = path.join(tenderOutputRoot, entry.name);
    const summaryPath = path.join(outputDirectory, "summary.json");
    const documentsJsonPath = path.join(outputDirectory, "tender_documents.json");
    const documentsCsvPath = path.join(outputDirectory, "tender_documents.csv");
    const legalCsvPath = path.join(outputDirectory, "legal_terms.csv");
    const technicalCsvPath = path.join(outputDirectory, "technical_terms.csv");
    const financialCsvPath = path.join(outputDirectory, "financial_terms.csv");
    const complianceCsvPath = path.join(outputDirectory, "compliance_terms.csv");
    const skippedPath = path.join(outputDirectory, "skipped_docs.json");

    if (!fs.existsSync(summaryPath) || !fs.existsSync(documentsJsonPath)) {
      continue;
    }

    const documents = readJsonFile(documentsJsonPath, []);
    const summary = readJsonFile(summaryPath, null);
    const skippedDocuments = readJsonFile(skippedPath, []);
    const sampleFilePath = documents[0]?.filePath || skippedDocuments[0]?.filePath || "";
    const sourceDirectory = sampleFilePath ? path.dirname(sampleFilePath) : "";
    const stats = fs.statSync(summaryPath);
    const id = `recovered-${entry.name}`;

    jobs.set(id, {
      id,
      status: "SUCCEEDED",
      sourceDirectory,
      outputDirectory,
      totalFiles: Number(summary?.scannedFiles || documents.length + skippedDocuments.length || 0),
      processedFiles: Number(summary?.scannedFiles || documents.length + skippedDocuments.length || 0),
      tenderFiles: Number(summary?.tenderDocuments || documents.length || 0),
      skippedFiles: Number(summary?.skippedDocuments || skippedDocuments.length || 0),
      currentFile: null,
      error: null,
      summary,
      resultFiles: {
        documentsJsonPath,
        documentsCsvPath,
        legalCsvPath,
        technicalCsvPath,
        financialCsvPath,
        complianceCsvPath,
        skippedPath,
        summaryPath,
      },
      sourceFiles: [],
      uploadCount: documents.length,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
    });
  }
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8") || "null") ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

module.exports = {
  createTenderJob,
  getTenderJob,
  listTenderJobs,
  updateTenderJob,
};
