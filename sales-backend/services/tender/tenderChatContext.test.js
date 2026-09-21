const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { buildTenderChatContext, selectExcerpts } = require("./tenderChatContext");

test("chat reads every source file, including unclassified files beyond the first four", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tender-chat-test-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const documents = [];
  for (let index = 0; index < 7; index += 1) {
    const filePath = path.join(directory, `volume-${index}.txt`);
    await fs.writeFile(filePath, `Unique clause for volume ${index}.`);
    if (index < 5) documents.push({ filePath, relativePath: path.basename(filePath) });
  }
  const result = await buildTenderChatContext({ documents, sourceFiles: [documents[0]], sourceDirectory: directory, question: "List clauses" });
  assert.equal(result.inventory.length, 7);
  for (let index = 0; index < 7; index += 1) {
    assert.ok(result.context.includes(`Unique clause for volume ${index}.`));
  }
});

test("questions retrieve clauses beyond the old 50,000 character cutoff", () => {
  const text = "General background. ".repeat(5000) + "\nThe zephyr warranty lasts 37 months.\n";
  const excerpt = selectExcerpts(text, "What is the zephyr warranty?", 5000);
  assert.ok(excerpt.includes("zephyr warranty lasts 37 months"));
  assert.ok(excerpt.length <= 5000);
});

test("unreadable and missing sources stay inventoried without blocking readable files", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tender-chat-test-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const good = path.join(directory, "good.txt");
  const empty = path.join(directory, "empty.txt");
  await fs.writeFile(good, "Submission is on Tuesday.");
  await fs.writeFile(empty, "");
  const result = await buildTenderChatContext({
    documents: [good, empty, path.join(directory, "missing.txt")].map((filePath) => ({ filePath })),
    question: "When is submission?",
  });
  assert.ok(result.context.includes("Submission is on Tuesday."));
  assert.match(result.inventory[1].status, /no readable text/);
  assert.match(result.inventory[2].status, /stored source file is unavailable/);
});

test("large sets retain evidence from every file within the text budget", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tender-chat-test-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const documents = [];
  for (let index = 0; index < 8; index += 1) {
    const filePath = path.join(directory, `volume-${index}.txt`);
    await fs.writeFile(filePath, "General background. ".repeat(5000) + `\nZephyr warranty for volume ${index} is 37 months.\n`);
    documents.push({ filePath });
  }
  const result = await buildTenderChatContext({ documents, question: "What is the zephyr warranty?" });
  for (let index = 0; index < 8; index += 1) {
    assert.ok(result.context.includes(`Zephyr warranty for volume ${index}`));
  }
  assert.ok(result.context.length < 161000);
});
