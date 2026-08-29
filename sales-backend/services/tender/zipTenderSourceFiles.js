const archiver = require("archiver");
const path = require("path");

const { collectSupportedFiles } = require("./documentTextExtractor");

async function streamTenderSourceZip({ sourceDirectory, outputName, res }) {
  const absoluteSourceDirectory = path.isAbsolute(sourceDirectory)
    ? path.normalize(sourceDirectory)
    : path.resolve(process.cwd(), sourceDirectory);

  const files = await collectSupportedFiles(absoluteSourceDirectory);
  if (files.length === 0) {
    const error = new Error("No supported tender files were found for this job.");
    error.status = 404;
    throw error;
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${outputName}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (error) => {
    throw error;
  });

  archive.pipe(res);

  for (const filePath of files) {
    const relativePath = path.relative(absoluteSourceDirectory, filePath) || path.basename(filePath);
    archive.file(filePath, { name: relativePath });
  }

  await archive.finalize();
}

module.exports = {
  streamTenderSourceZip,
};
