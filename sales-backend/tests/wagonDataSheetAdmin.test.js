const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const express = require("express");
const mongoose = require("mongoose");
const Model = require("../models/WagonDataSheetRow");
const createRoutes = require("../routes/wagonDataSheetAdmin.routes");

// Exercise the production normalizers without loading unrelated application routes.
const source = fs.readFileSync(require.resolve("../routes/wagonDataSheet.routes"), "utf8");
const context = vm.createContext({});
vm.runInContext(
  source.slice(source.indexOf("const asText ="), source.indexOf("const INSPECTION_STAGES =")) +
  source.slice(source.indexOf("const findDuplicateSerialNumber ="), source.indexOf("const asObjectIdList =")) +
  ";this.helpers = { assertValidTexNo, asSerialNumbers, asUniqueSerialHeatNumbers, normalizeWheelDataKey };", context);

const rowId = "507f1f77bcf86cd799439011";
const version = "2026-09-22T10:00:00.000Z";
async function fixture(run) {
  let row = new Model({ _id: rowId, wheelDataKey: "LINK-1", texNo: "B-137", updatedAt: version, secondZone: { bearing: { serialNumbers: ["B1"] } }, inspectionProgress: { stages: [{ key: "boxing", status: "completed" }] } });
  const state = { calls: [], duplicate: null, failDelete: false };
  const attachSave = () => { row.save = async () => { await row.validate(); state.calls.push(["save"]); }; };
  attachSave();
  const Row = {
    findById: (id) => ({ session: async () => id === rowId ? row : null }),
    find: () => ({ select: () => ({ lean: async () => [{ _id: "507f1f77bcf86cd799439012", wheelDataKey: "LINK-2" }] }) }),
    findOne: (query) => ({ session: async () => { state.lastDuplicateQuery = query; return state.duplicate; } }),
    updateMany: async (...args) => { state.calls.push(["updateMany", ...args]); },
    deleteOne: async (...args) => { if (state.failDelete) throw new Error("Simulated database failure"); state.calls.push(["deleteOne", ...args]); },
  };
  const app = express();
  app.use(express.json());
  app.use("/admin/rows", createRoutes({
    Row, ...context.helpers,
    mongoose: { Types: mongoose.Types, connection: { transaction: async (callback) => {
      const snapshot = row.toObject();
      const callCount = state.calls.length;
      try { await callback({ testSession: true }); }
      catch (error) { row = new Model(snapshot); attachSave(); state.calls.length = callCount; throw error; }
    } } },
    // Simulates the already-verified identity provided by the real auth middleware.
    authMiddleware: (req, res, next) => {
      if (!req.headers["x-test-role"]) return res.status(401).json({ message: "Token required" });
      req.user = { role: req.headers["x-test-role"] }; next();
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const request = async (method, body, role = "admin", id = rowId) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/admin/rows/${id}`, {
      method, headers: { "Content-Type": "application/json", ...(role ? { "x-test-role": role } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  try { await run({ request, state, row: () => row }); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("all admin endpoints deny quality admin, inspectors, absent auth and forged body roles", async () => fixture(async ({ request, state }) => {
  for (const method of ["GET", "PATCH", "DELETE"]) {
    for (const role of ["quality-admin", "ground-inspector", "wagon-data-viewer", ""]) {
      const result = await request(method, method === "GET" ? null : { submittedByRole: "admin", updatedAt: version }, role);
      assert.equal(result.status, role ? 403 : 401);
    }
  }
  assert.equal(state.calls.length, 0);
}));
test("editor loads actual row, linked entries, and no bearing heat field", async () => fixture(async ({ request }) => {
  const { status, body } = await request("GET");
  assert.equal(status, 200);
  assert.equal(body.data.values.texNo, "B-137");
  assert.equal(body.data.linkedRecords[0].label, "LINK-2");
  assert.ok(!body.data.fields.some((field) => field.path.includes("bearingHeat")));
  assert.equal((await request("GET", null, "admin", "invalid")).status, 400);
  assert.equal((await request("GET", null, "admin", "507f1f77bcf86cd799439099")).status, 404);
}));
test("edits preserve stage history and validate serial/heat pairs and bearing uniqueness", async () => fixture(async ({ request, row }) => {
  const patch = (changes) => request("PATCH", { updatedAt: version, changes });
  assert.equal((await patch({ wagonNo: "W123" })).status, 200);
  assert.equal(row().wagonNo, "W123");
  assert.equal(row().inspectionProgress.stages[0].status, "completed");
  assert.equal(row().texNo, "B-137");
  for (const key of ["axle", "wheel"]) {
    const serialPath = `secondZone.${key}.serialNumbers`;
    const heatPath = `secondZone.${key}HeatNumbers`;
    assert.equal((await patch({ [serialPath]: "S1\nS2", [heatPath]: "H1\nH1" })).status, 200);
    assert.equal((await patch({ [serialPath]: "S1\nS1", [heatPath]: "H1\nH2" })).status, 200);
    assert.equal((await patch({ [serialPath]: "s1\nS1", [heatPath]: "H1\nh1" })).status, 400);
  }
  assert.equal((await patch({ "secondZone.bearing.serialNumbers": "B1\nb1" })).status, 400);
  assert.equal((await patch({ "secondZone.axle.serialNumbers": Array(9).fill("S").join("\n") })).status, 400);
}));
test("protected fields and stale updates/deletes are rejected", async () => fixture(async ({ request, state }) => {
  for (const path of ["projectId", "inspectionProgress", "firstZone.submittedBy", "wheelDataUsage", "__proto__"]) {
    assert.equal((await request("PATCH", { updatedAt: version, changes: { [path]: "bad" } })).status, 400);
  }
  for (const method of ["PATCH", "DELETE"]) assert.equal((await request(method, { updatedAt: "2020-01-01", changes: { texNo: "B138" } })).status, 409);
  assert.equal(state.calls.length, 0);
}));
test("duplicate identifiers are rejected; wagon numbers remain unique across projects", async () => fixture(async ({ request, state }) => {
  state.duplicate = { _id: "another" };
  assert.equal((await request("PATCH", { updatedAt: version, changes: { wagonNo: "W123" } })).status, 409);
  assert.ok(!Object.hasOwn(state.lastDuplicateQuery, "projectId"));
  assert.equal((await request("PATCH", { updatedAt: version, changes: { texNo: "B138" } })).status, 409);
  assert.ok(Object.hasOwn(state.lastDuplicateQuery, "projectId"));
}));
test("changing a wheel link refreshes both bogie link caches in the transaction", async () => fixture(async ({ request, state }) => {
  assert.equal((await request("PATCH", { updatedAt: version, changes: { wheelDataKey: " link-3 " } })).status, 200);
  const updates = state.calls.filter(([operation]) => operation === "updateMany");
  assert.equal(updates.length, 2);
  assert.equal(updates[0][2].$set["firstZone.bogie1WheelDataRows.$[link].wheelDataKey"], "LINK-3");
  assert.ok(updates.every((call) => call[3].session));
}));
test("delete unlinks references, releases wheel usage, and removes only the selected row", async () => fixture(async ({ request, state }) => {
  assert.equal((await request("DELETE", { updatedAt: version })).status, 200);
  assert.equal(state.calls.length, 3);
  assert.ok(state.calls[0][2].$pull["firstZone.bogie1WheelDataRows"]);
  assert.equal(state.calls[1][2].$set["wheelDataUsage.linkedProjectRowId"], null);
  assert.equal(String(state.calls[2][1]._id), rowId);
  assert.ok(state.calls[2][2].session);
}));
test("database failure rolls back the delete transaction", async () => fixture(async ({ request, state }) => {
  state.failDelete = true;
  assert.equal((await request("DELETE", { updatedAt: version })).status, 400);
  assert.equal(state.calls.length, 0);
}));
