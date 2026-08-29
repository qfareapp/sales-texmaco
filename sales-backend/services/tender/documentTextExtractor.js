const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");
const xlsx = require("xlsx");
const { extractTextFromImages } = require("./openaiDocumentOcr");

const execFileAsync = promisify(execFile);
const pdfOcrCache = new Map();

const SUPPORTED_EXTENSIONS = new Set([
  ".csv",
  ".docx",
  ".htm",
  ".html",
  ".md",
  ".pdf",
  ".txt",
  ".xls",
  ".xlsx",
]);

async function collectSupportedFiles(rootDirectory) {
  const collected = [];
  await walk(rootDirectory, collected);
  return collected.sort((a, b) => a.localeCompare(b));
}

async function walk(currentPath, collected) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, collected);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) {
      collected.push(fullPath);
    }
  }
}

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return extractPdf(filePath);
    case ".docx":
      return extractDocx(filePath);
    case ".xls":
    case ".xlsx":
      return extractSpreadsheet(filePath);
    case ".csv":
    case ".txt":
    case ".md":
    case ".htm":
    case ".html":
      return fs.readFile(filePath, "utf8");
    default:
      return "";
  }
}

async function extractPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const extractedText = result.text || "";
    if (!shouldRunPdfOcrFallback(extractedText)) {
      return extractedText;
    }

    return extractPdfViaOcr(filePath, extractedText);
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || "";
}

async function extractSpreadsheet(filePath) {
  const workbook = xlsx.readFile(filePath, { cellText: true, cellDates: true });
  const sections = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });

    sections.push(`[Sheet: ${sheetName}]`);
    for (const row of rows) {
      const line = row
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" | ");
      if (line) {
        sections.push(line);
      }
    }
  }

  return sections.join("\n");
}

function buildTenderExcerpt(text) {
  const normalized = String(text || "").replace(/\u0000/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const lines = normalized.split(/\r?\n/);
  const preferred = [];
  const fallback = [];
  const keywordPattern =
    /\b(tender|bid|bidder|eligibility|emd|earnest money|tender fee|turnover|experience|scope of work|technical|legal|compliance|contract|penalt|liquidated damages|submission|authority|procurement|qualification)\b/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (keywordPattern.test(line) || /\d/.test(line)) {
      preferred.push(line);
    } else if (fallback.length < 120) {
      fallback.push(line);
    }
  }

  const combined = [...preferred, ...fallback].join("\n");
  return combined.slice(0, 45000);
}

function shouldRunPdfOcrFallback(text) {
  const normalized = String(text || "").replace(/\u0000/g, " ").trim();
  if (!normalized) {
    return true;
  }

  if (normalized.length >= 120) {
    return false;
  }

  const alphaNumericMatches = normalized.match(/[A-Za-z0-9]/g) || [];
  return alphaNumericMatches.length < 30;
}

async function extractPdfViaOcr(filePath, existingText) {
  if (!process.env.OPENAI_API_KEY) {
    return existingText || "";
  }

  const cacheKey = await buildOcrCacheKey(filePath);
  if (cacheKey && pdfOcrCache.has(cacheKey)) {
    return pdfOcrCache.get(cacheKey) || existingText || "";
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tender-ocr-"));

  try {
    const imagePaths = await renderPdfPagesToImages(filePath, tempRoot);
    if (imagePaths.length === 0) {
      return existingText || "";
    }

    const ocrText = await extractTextFromImages({
      fileName: path.basename(filePath),
      relativePath: path.basename(filePath),
      imagePaths,
    });

    const finalText = ocrText || existingText || "";
    if (cacheKey && finalText) {
      pdfOcrCache.set(cacheKey, finalText);
    }
    return finalText;
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}

async function renderPdfPagesToImages(filePath, outputDirectory) {
  const maxPages = String(Number(process.env.TENDER_OCR_MAX_PAGES || 12));
  const dpi = String(Number(process.env.TENDER_OCR_DPI || 144));
  const script = [
    "import json",
    "import os",
    "import sys",
    "import fitz",
    "file_path = sys.argv[1]",
    "output_dir = sys.argv[2]",
    "max_pages = max(1, int(sys.argv[3]))",
    "dpi = max(72, int(sys.argv[4]))",
    "doc = fitz.open(file_path)",
    "page_paths = []",
    "try:",
    "    total = min(len(doc), max_pages)",
    "    matrix = fitz.Matrix(dpi / 72.0, dpi / 72.0)",
    "    for index in range(total):",
    "        page = doc.load_page(index)",
    "        pix = page.get_pixmap(matrix=matrix, alpha=False)",
    "        out_path = os.path.join(output_dir, f'page-{index + 1:03d}.png')",
    "        pix.save(out_path)",
    "        page_paths.append(out_path)",
    "finally:",
    "    doc.close()",
    "print(json.dumps(page_paths))",
  ].join("\n");

  const { stdout } = await execFileAsync(
    "python",
    ["-c", script, filePath, outputDirectory, maxPages, dpi],
    {
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  const parsed = JSON.parse(String(stdout || "[]").trim() || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

async function buildOcrCacheKey(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return `${filePath}:${stats.size}:${stats.mtimeMs}`;
  } catch (_error) {
    return "";
  }
}

module.exports = {
  buildTenderExcerpt,
  collectSupportedFiles,
  extractTextFromFile,
};
