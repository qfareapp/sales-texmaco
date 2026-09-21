const path = require("path");
const { collectSupportedFiles, extractTextFromFile } = require("./documentTextExtractor");

// Search the whole extracted text before choosing bounded excerpts for the model.
function selectExcerpts(text, question, budget) {
  if (text.length <= budget) return text;
  const terms = [...new Set(String(question).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])];
  const chunks = [];
  const size = Math.min(2400, budget);
  const stride = Math.max(1, size - Math.min(300, Math.floor(size / 4)));
  for (let offset = 0; offset < text.length; offset += stride) {
    const value = text.slice(offset, offset + size);
    const lower = value.toLowerCase();
    const score = terms.reduce((total, term) => total + (lower.includes(term) ? 1 : 0), 0);
    chunks.push({ offset, value, score });
  }
  chunks.sort((a, b) => b.score - a.score || a.offset - b.offset);
  const selected = [];
  let remaining = budget;
  for (const chunk of chunks) {
    const excerpt = `[Text offset ${chunk.offset}]\n${chunk.value}`;
    if (remaining < 80) break;
    selected.push({ offset: chunk.offset, value: excerpt.slice(0, remaining) });
    remaining -= Math.min(excerpt.length, remaining) + 5;
  }
  return selected.sort((a, b) => a.offset - b.offset).map((chunk) => chunk.value).join("\n...\n");
}

async function buildTenderChatContext({ documents, sourceFiles = [], sourceDirectory, question }) {
  const byPath = new Map();
  for (const document of [...documents, ...sourceFiles]) {
    if (!document?.filePath) continue;
    const key = path.resolve(document.filePath);
    if (!byPath.has(key)) byPath.set(key, document);
  }
  let discoveryWarning = "";
  if (sourceDirectory) {
    try {
      for (const filePath of await collectSupportedFiles(sourceDirectory)) {
        const key = path.resolve(filePath);
        if (!byPath.has(key)) {
          byPath.set(key, { filePath, relativePath: path.relative(sourceDirectory, filePath) });
        }
      }
    } catch (_error) {
      discoveryWarning = "The source folder could not be listed; the saved file inventory is used below.";
    }
  }

  const inventory = [];
  const blocks = [];
  const budget = Math.max(100, Math.floor(160000 / Math.max(1, byPath.size)));
  for (const document of byPath.values()) {
    const name = document.relativePath || path.basename(document.filePath);
    try {
      const text = String(await extractTextFromFile(document.filePath) || "").replace(/\u0000/g, " ").trim();
      if (!text) {
        inventory.push({ file: name, status: "Uploaded, but no readable text could be extracted" });
        continue;
      }
      inventory.push({ file: name, status: text.length > budget ? "Readable; question-relevant excerpts supplied" : "Readable; full extracted text supplied" });
      blocks.push(`File: ${name}\n${selectExcerpts(text, question, budget)}`);
    } catch (error) {
      inventory.push({ file: name, status: error.code === "ENOENT" ? "Uploaded record exists, but stored source file is unavailable" : "Uploaded, but text extraction failed" });
    }
  }
  return { inventory, context: blocks.join("\n\n---\n\n"), discoveryWarning };
}

module.exports = { buildTenderChatContext, selectExcerpts };
