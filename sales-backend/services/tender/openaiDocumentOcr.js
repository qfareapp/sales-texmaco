const fs = require("fs/promises");
const OpenAI = require("openai");

let client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for OCR fallback");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

async function extractTextFromImages({ fileName, relativePath, imagePaths }) {
  const content = [
    {
      type: "input_text",
      text:
        "These images are pages from a scanned tender or procurement document. " +
        "Perform OCR and return only the extracted text. Preserve headings, tender numbers, dates, names, amounts, and table-like rows as plain text. " +
        "Do not summarize or invent missing text.\n\n" +
        `File name: ${fileName}\n` +
        `Relative path: ${relativePath}`,
    },
  ];

  for (const imagePath of imagePaths) {
    const buffer = await fs.readFile(imagePath);
    content.push({
      type: "input_image",
      image_url: `data:image/png;base64,${buffer.toString("base64")}`,
    });
  }

  const response = await getClient().responses.create({
    model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini",
    input: [
      {
        role: "user",
        content,
      },
    ],
  });

  return String(response.output_text || "").trim();
}

module.exports = {
  extractTextFromImages,
};
