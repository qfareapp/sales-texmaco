const OpenAI = require("openai");

const { extractTextFromFile } = require("./documentTextExtractor");

let client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for tender Q&A");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

async function answerTenderQuestion({ documents, selectedDocument, question }) {
  const allDocuments = Array.isArray(documents) ? documents.filter(Boolean) : [];
  const focusDocument = selectedDocument || allDocuments[0];

  if (!focusDocument) {
    throw new Error("No tender documents are available for this job.");
  }

  const rankedDocuments = [...allDocuments].sort((left, right) => scoreDocument(right) - scoreDocument(left));
  const summaryContext = JSON.stringify(
    rankedDocuments.map((document) => ({
      relativePath: document.relativePath || null,
      documentKind: document.documentKind || null,
      tenderId: document.tenderId || null,
      tenderTitle: document.tenderTitle || null,
      issuingAuthority: document.issuingAuthority || null,
      submissionDeadline: document.submissionDeadline || null,
      bidOpeningDate: document.bidOpeningDate || null,
      bidValidity: document.bidValidity || null,
      estimatedValue: document.estimatedValue || null,
      emdAmount: document.emdAmount || null,
      tenderFee: document.tenderFee || null,
      contactDetails: document.contactDetails || [],
      technicalCriteria: document.technicalCriteria || [],
      legalCriteria: document.legalCriteria || [],
      financialCriteria: document.financialCriteria || [],
      complianceRequirements: document.complianceRequirements || [],
      importantDates: document.importantDates || [],
      requiredDocuments: document.requiredDocuments || [],
      penalties: document.penalties || [],
      paymentTerms: document.paymentTerms || [],
      notes: document.notes || [],
    })),
    null,
    2
  );

  const contextBlocks = [];
  for (const document of rankedDocuments.slice(0, 4)) {
    const rawText = await extractTextFromFile(document.filePath);
    const normalizedText = String(rawText || "").replace(/\u0000/g, " ").trim();
    if (!normalizedText) {
      continue;
    }

    contextBlocks.push(
      [
        `File: ${document.relativePath || document.filePath}`,
        `Document kind: ${document.documentKind || "n/a"}`,
        normalizedText.slice(0, 50000),
      ].join("\n")
    );
  }

  if (contextBlocks.length === 0) {
    throw new Error("No readable text could be extracted from the uploaded tender documents.");
  }

  const context = contextBlocks.join("\n\n---\n\n").slice(0, 160000);

  const response = await getClient().responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You answer questions about a tender only from the provided tender document set context and structured analysis. " +
              "Use the full uploaded tender set, not just the currently focused file, because dates and commercial values may appear in NIT or tender documents while specifications contain only scope. " +
              "Prefer the most explicit tender notice or tender document when multiple files disagree. " +
              "Be concise and factual. If the answer is not clearly present, say that it is not available in the uploaded tender documents. " +
              "Do not invent names, dates, values, or contact details.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Currently focused file: ${focusDocument.relativePath || focusDocument.filePath}\n\n` +
              `Tender set structured summary:\n${summaryContext}\n\n` +
              `Tender set document text:\n${context}\n\n` +
              `Question: ${question}`,
          },
        ],
      },
    ],
  });

  return String(response.output_text || "").trim();
}

function scoreDocument(document) {
  const kind = String(document?.documentKind || "").toLowerCase();
  const title = String(document?.tenderTitle || "").toLowerCase();
  let score = Number(document?.confidence || 0);

  if (kind.includes("nit")) score += 50;
  if (kind.includes("tender document")) score += 40;
  if (kind.includes("tender")) score += 20;
  if (kind.includes("spec")) score -= 10;
  if (kind.includes("annex")) score -= 5;
  if (title.includes("tender")) score += 5;

  return score;
}

module.exports = {
  answerTenderQuestion,
};
