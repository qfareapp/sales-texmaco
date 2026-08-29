const fs = require("fs/promises");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const {
  collectSupportedFiles,
} = require("./documentTextExtractor");
const { getTenderJob, updateTenderJob } = require("../../store/tenderJobStore");

let configured = false;

function ensureCloudinaryConfig() {
  if (configured) {
    return true;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  configured = true;
  return true;
}

async function syncTenderSourceFiles(jobId) {
  const job = getTenderJob(jobId);
  if (!job) {
    throw new Error(`Tender job ${jobId} was not found`);
  }

  const sourceDirectory = String(job.sourceDirectory || "").trim();
  if (!sourceDirectory) {
    return [];
  }

  const absoluteSourceDirectory = path.isAbsolute(sourceDirectory)
    ? path.normalize(sourceDirectory)
    : path.resolve(process.cwd(), sourceDirectory);

  const files = await collectSupportedFiles(absoluteSourceDirectory);
  const existingFiles = Array.isArray(job.sourceFiles) ? job.sourceFiles : [];
  const byRelativePath = new Map(existingFiles.map((file) => [file.relativePath, file]));
  const nextFiles = [];

  for (const filePath of files) {
    const relativePath = path.relative(absoluteSourceDirectory, filePath) || path.basename(filePath);
    const existing = byRelativePath.get(relativePath);
    const stats = await fs.stat(filePath);

    if (existing?.url) {
      nextFiles.push({
        ...existing,
        size: stats.size,
        relativePath,
        filePath,
      });
      continue;
    }

    const uploaded = await uploadSourceFile({
      jobId,
      filePath,
      relativePath,
      size: stats.size,
    });
    nextFiles.push(uploaded);
  }

  updateTenderJob(jobId, {
    sourceFiles: nextFiles,
  });

  return nextFiles;
}

async function uploadSourceFile({ jobId, filePath, relativePath, size }) {
  if (!ensureCloudinaryConfig()) {
    return {
      relativePath,
      filePath,
      size,
      url: "",
      publicId: "",
      storage: "local",
    };
  }

  const safeRelativePath = relativePath.replace(/[<>:"\\|?*\u0000-\u001F]/g, "-");
  const baseName = safeRelativePath.replace(/[\\/]/g, "--");
  const extension = path.extname(baseName);
  const publicId = extension
    ? baseName.slice(0, -extension.length)
    : baseName;

  const result = await cloudinary.uploader.upload(filePath, {
    folder: `texmaco-tenders/${jobId}`,
    public_id: publicId,
    resource_type: "raw",
    use_filename: false,
    unique_filename: false,
    overwrite: true,
  });

  return {
    relativePath,
    filePath,
    size,
    url: result.secure_url || result.url || "",
    publicId: result.public_id || "",
    storage: "cloudinary",
  };
}

module.exports = {
  syncTenderSourceFiles,
};
