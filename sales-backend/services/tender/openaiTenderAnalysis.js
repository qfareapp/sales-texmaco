const OpenAI = require("openai");

let client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for tender extraction");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

async function analyzeTenderContent({ fileName, relativePath, text }) {
  const response = await getClient().responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You analyze tender and procurement documents. " +
              "Identify whether the document is relevant to a tender process. " +
              "Extract only facts stated in the document. Never invent missing values. " +
              "Separate legal, technical, financial, compliance, timeline, and document checklist requirements. " +
              "If a field is missing, return null or an empty array.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `File name: ${fileName}\nRelative path: ${relativePath}\n\n` +
              "Extracted text:\n" +
              text,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "tender_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            isTenderRelated: { type: "boolean" },
            confidence: { type: "number" },
            documentKind: { type: ["string", "null"] },
            tenderId: { type: ["string", "null"] },
            tenderTitle: { type: ["string", "null"] },
            issuingAuthority: { type: ["string", "null"] },
            procurementMethod: { type: ["string", "null"] },
            submissionDeadline: { type: ["string", "null"] },
            bidOpeningDate: { type: ["string", "null"] },
            preBidMeetingDate: { type: ["string", "null"] },
            bidValidity: { type: ["string", "null"] },
            workLocation: { type: ["string", "null"] },
            currency: { type: ["string", "null"] },
            estimatedValue: { type: ["string", "null"] },
            emdAmount: { type: ["string", "null"] },
            tenderFee: { type: ["string", "null"] },
            summary: { type: ["string", "null"] },
            eligibilityOverview: { type: ["string", "null"] },
            riskLevel: { type: ["string", "null"] },
            legalCriteria: {
              type: "array",
              items: { type: "string" },
            },
            technicalCriteria: {
              type: "array",
              items: { type: "string" },
            },
            financialCriteria: {
              type: "array",
              items: { type: "string" },
            },
            complianceRequirements: {
              type: "array",
              items: { type: "string" },
            },
            importantDates: {
              type: "array",
              items: { type: "string" },
            },
            requiredDocuments: {
              type: "array",
              items: { type: "string" },
            },
            penalties: {
              type: "array",
              items: { type: "string" },
            },
            paymentTerms: {
              type: "array",
              items: { type: "string" },
            },
            contactDetails: {
              type: "array",
              items: { type: "string" },
            },
            notes: {
              type: "array",
              items: { type: "string" },
            },
            exclusionReason: { type: ["string", "null"] },
          },
          required: [
            "isTenderRelated",
            "confidence",
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
            "summary",
            "eligibilityOverview",
            "riskLevel",
            "legalCriteria",
            "technicalCriteria",
            "financialCriteria",
            "complianceRequirements",
            "importantDates",
            "requiredDocuments",
            "penalties",
            "paymentTerms",
            "contactDetails",
            "notes",
            "exclusionReason",
          ],
        },
      },
    },
  });

  return JSON.parse(response.output_text || "{}");
}

module.exports = {
  analyzeTenderContent,
};
