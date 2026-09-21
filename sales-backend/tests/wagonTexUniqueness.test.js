const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../routes/wagonDataSheet.routes.js"), "utf8");
const validation = source.slice(source.indexOf("const ensureUniqueWagonIdentifiers ="), source.indexOf('router.get("/projects"'));
const asText = (value) => String(value || "").trim();

function validator(rows) {
  // Run the route's actual validation with an in-memory query adapter; no database writes.
  return vm.runInNewContext(`${validation}\nensureUniqueWagonIdentifiers`, {
    asText,
    buildExactMatchRegex: (value) => new RegExp(`^${value}$`, "i"),
    WagonDataSheetRow: {
      find(query) {
        const found = rows.filter((row) =>
          (!query._id || row._id !== query._id.$ne) &&
          query.$or.some((condition) => Object.entries(condition).every(([field, value]) =>
            value instanceof RegExp ? value.test(row[field] || "") : row[field] === value
          ))
        );
        return { select: () => ({ lean: async () => found }) };
      },
    },
  });
}

const existing = { _id: "row-a", projectId: "project-a", texNo: "113", wagonNo: "W1" };

test("same TEX is accepted in another project", async () => {
  await validator([existing])({ projectId: "project-b", texNo: "113" });
});

test("same TEX is rejected within a project", async () => {
  await assert.rejects(validator([existing])({ projectId: "project-a", texNo: "113" }), /already filled in this project/);
});

test("TEX comparison stays case insensitive and excludes the row being edited", async () => {
  const row = { ...existing, texNo: "B113" };
  await assert.rejects(validator([row])({ projectId: "project-a", texNo: "b113" }), /already filled/);
  await validator([row])({ rowId: "row-a", projectId: "project-a", texNo: "B113", wagonNo: "W1" });
});

test("wagon number remains unique across projects", async () => {
  await assert.rejects(validator([existing])({ projectId: "project-b", texNo: "113", wagonNo: "W1" }), /Wagon No. already filled/);
});

test("duplicate reporting groups TEX numbers by project", () => {
  const start = source.indexOf("    const texFrequency = new Map();");
  const end = source.indexOf("    const buildExceptionRow", start);
  const entries = vm.runInNewContext(`${source.slice(start, end)}\n[...texFrequency.values()]`, {
    asText,
    rowsWithProgress: [existing, { ...existing, projectId: "project-b" }, { ...existing, texNo: "113" }],
  });
  assert.deepEqual(Array.from(entries), [2, 1]);
});
