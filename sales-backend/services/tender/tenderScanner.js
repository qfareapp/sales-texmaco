const fs = require("fs/promises");
const path = require("path");

const {
  buildTenderExcerpt,
  collectSupportedFiles,
  extractTextFromFile,
} = require("./documentTextExtractor");
const { analyzeTenderContent } = require("./openaiTenderAnalysis");
const { getTenderJob, updateTenderJob } = require("../../store/tenderJobStore");

async function runTenderScan(jobId) {
  const job = getTenderJob(jobId);
  if (!job) {
    throw new Error(`Tender job ${jobId} was not found`);
  }

  const sourceDirectory = path.isAbsolute(job.sourceDirectory)
    ? path.normalize(job.sourceDirectory)
    : path.resolve(process.cwd(), job.sourceDirectory);
  const outputDirectory = path.isAbsolute(job.outputDirectory)
    ? path.normalize(job.outputDirectory)
    : path.resolve(process.cwd(), job.outputDirectory);

  await fs.mkdir(outputDirectory, { recursive: true });

  const files = await collectSupportedFiles(sourceDirectory);
  updateTenderJob(jobId, {
    status: "RUNNING",
    sourceDirectory,
    outputDirectory,
    totalFiles: files.length,
    processedFiles: 0,
    tenderFiles: 0,
    skippedFiles: 0,
    error: null,
  });

  const tenderDocuments = [];
  const skippedDocuments = [];

  for (const filePath of files) {
    const relativePath = path.relative(sourceDirectory, filePath) || path.basename(filePath);
    updateTenderJob(jobId, {
      currentFile: relativePath,
    });

    try {
      const extractedText = await extractTextFromFile(filePath);
      const excerpt = buildTenderExcerpt(extractedText);

      if (!excerpt) {
        skippedDocuments.push({
          filePath,
          relativePath,
          reason: "No extractable text",
        });
        bumpProgress(jobId, false);
        continue;
      }

      const analysis = await analyzeTenderContent({
        fileName: path.basename(filePath),
        relativePath,
        text: excerpt,
      });

      if (analysis.isTenderRelated) {
        tenderDocuments.push({
          filePath,
          relativePath,
          ...analysis,
        });
        bumpProgress(jobId, true);
      } else {
        skippedDocuments.push({
          filePath,
          relativePath,
          reason: analysis.exclusionReason || "Not tender-related",
          confidence: analysis.confidence,
        });
        bumpProgress(jobId, false);
      }
    } catch (error) {
      skippedDocuments.push({
        filePath,
        relativePath,
        reason: error.message,
      });
      bumpProgress(jobId, false);
    }
  }

  const summary = buildSummary(tenderDocuments, skippedDocuments, files.length);
  const resultFiles = await writeOutputs({
    outputDirectory,
    tenderDocuments,
    skippedDocuments,
    summary,
  });

  updateTenderJob(jobId, {
    status: "SUCCEEDED",
    currentFile: null,
    summary,
    resultFiles,
  });
}

function buildSummary(tenderDocuments, skippedDocuments, totalFiles) {
  return {
    scannedFiles: totalFiles,
    tenderDocuments: tenderDocuments.length,
    skippedDocuments: skippedDocuments.length,
    withLegalCriteria: tenderDocuments.filter((doc) => doc.legalCriteria.length > 0).length,
    withTechnicalCriteria: tenderDocuments.filter((doc) => doc.technicalCriteria.length > 0)
      .length,
    withFinancialCriteria: tenderDocuments.filter((doc) => doc.financialCriteria.length > 0)
      .length,
    withComplianceRequirements: tenderDocuments.filter(
      (doc) => doc.complianceRequirements.length > 0
    ).length,
  };
}

function bumpProgress(jobId, foundTender) {
  const current = getTenderJob(jobId);
  updateTenderJob(jobId, {
    processedFiles: current.processedFiles + 1,
    tenderFiles: current.tenderFiles + (foundTender ? 1 : 0),
    skippedFiles: current.skippedFiles + (foundTender ? 0 : 1),
  });
}

async function writeOutputs({ outputDirectory, tenderDocuments, skippedDocuments, summary }) {
  const documentsJsonPath = path.join(outputDirectory, "tender_documents.json");
  const documentsCsvPath = path.join(outputDirectory, "tender_documents.csv");
  const legalCsvPath = path.join(outputDirectory, "legal_terms.csv");
  const technicalCsvPath = path.join(outputDirectory, "technical_terms.csv");
  const financialCsvPath = path.join(outputDirectory, "financial_terms.csv");
  const complianceCsvPath = path.join(outputDirectory, "compliance_terms.csv");
  const skippedPath = path.join(outputDirectory, "skipped_docs.json");
  const summaryPath = path.join(outputDirectory, "summary.json");

  await fs.writeFile(documentsJsonPath, JSON.stringify(tenderDocuments, null, 2));
  await fs.writeFile(documentsCsvPath, toTenderCsv(tenderDocuments));
  await fs.writeFile(legalCsvPath, toCategoryCsv(tenderDocuments, "legalCriteria"));
  await fs.writeFile(technicalCsvPath, toCategoryCsv(tenderDocuments, "technicalCriteria"));
  await fs.writeFile(financialCsvPath, toCategoryCsv(tenderDocuments, "financialCriteria"));
  await fs.writeFile(
    complianceCsvPath,
    toCategoryCsv(tenderDocuments, "complianceRequirements")
  );
  await fs.writeFile(skippedPath, JSON.stringify(skippedDocuments, null, 2));
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

  return {
    documentsJsonPath,
    documentsCsvPath,
    legalCsvPath,
    technicalCsvPath,
    financialCsvPath,
    complianceCsvPath,
    skippedPath,
    summaryPath,
  };
}

function toTenderCsv(rows) {
  const headers = [
    "relativePath",
    "documentKind",
    "tenderId",
    "tenderTitle",
    "issuingAuthority",
    "procurementMethod",
    "submissionDeadline",
    "bidOpeningDate",
    "preBidMeetingDate",
    "bidValidity",
    "workLocation",
    "currency",
    "estimatedValue",
    "emdAmount",
    "tenderFee",
    "eligibilityOverview",
    "riskLevel",
    "confidence",
    "technicalCriteria",
    "legalCriteria",
    "financialCriteria",
    "complianceRequirements",
    "importantDates",
    "requiredDocuments",
    "penalties",
    "paymentTerms",
    "contactDetails",
    "notes",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((header) => {
      const value = Array.isArray(row[header]) ? row[header].join(" | ") : row[header];
      return csvEscape(value == null ? "" : String(value));
    });
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

function toCategoryCsv(rows, key) {
  const lines = [["relativePath", "tenderId", "tenderTitle", "item"].join(",")];

  for (const row of rows) {
    const values = Array.isArray(row[key]) ? row[key] : [];
    for (const value of values) {
      lines.push(
        [
          csvEscape(row.relativePath),
          csvEscape(row.tenderId || ""),
          csvEscape(row.tenderTitle || ""),
          csvEscape(value),
        ].join(",")
      );
    }
  }

  return lines.join("\n");
}

function csvEscape(value) {
  const normalized = String(value || "");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

module.exports = {
  runTenderScan,
};
