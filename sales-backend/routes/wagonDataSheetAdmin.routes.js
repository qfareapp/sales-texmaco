const express = require("express");

const fields = [];
const add = (section, path, label, multiline = false) => fields.push({ section, path, label, multiline });
for (const [path, label] of Object.entries({ slNo: "SL No.", texNo: "TEX No.", wagonNo: "Wagon No.", wagonConfiguration: "Wagon Configuration", wheelDataKey: "Wheel Data Link" })) add("Entry", path, label);
for (const [path, label] of Object.entries({ wheelDia: "Wheel Diameter", wheelOrigin: "Wheel Origin / Make" })) add("CTRB", `secondZone.${path}`, label);
for (const [key, label] of [["axle", "Axle"], ["wheel", "Wheel"], ["bearing", "Bearing"]]) {
  add("CTRB", `secondZone.${key}.make`, `${label} Make`);
  add("CTRB", `secondZone.${key}.serialNumbers`, `${label} Serial Numbers`, true);
  if (key !== "bearing") add("CTRB", `secondZone.${key}HeatNumbers`, `${label} Heat Numbers`, true);
}
for (const [path, label] of Object.entries({ bogie1Make: "Bogie 1 Make", bogie2Make: "Bogie 2 Make", bogie1SerialNumber: "Bogie 1 Serial No.", bogie2SerialNumber: "Bogie 2 Serial No.", sabMake: "SAB Make", atlMake: "ATL Make", crfMake: "CRF Make" })) add("DM Line", `firstZone.${path}`, label);
for (const prefix of ["firstZone", "firstZone.additionalComponents"]) {
  for (const [key, label] of [["coupler", "Coupler"], ["draftGear", "Draft Gear"], ["dv", "DV"], ["bc", "BC"], ["ar", "AR"]]) {
    const section = prefix.includes("additional") ? "DM Line — Additional Components" : "DM Line";
    add(section, `${prefix}.${key}.make`, `${label} Make`);
    add(section, `${prefix}.${key}.serialNumbers`, `${label} Serial Numbers`, true);
  }
}
for (const [path, label] of Object.entries({ tareWeight: "Tare Weight", txrFitDate: "TXR Fit Date", manufactureDate: "Manufacture Date", rfidNo1: "RFID No. 1", rfidNo2: "RFID No. 2", dmNo: "DM No.", dmDate: "DM Date", rohDate: "ROH Date", returnOrPohDate: "Return / POH Date" })) add("DM Final", `finalAssembly.${path}`, label);
const readPath = (row, path) => path.split(".").reduce((value, key) => value?.[key], row);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

module.exports = function createAdminRoutes({ Row, mongoose, authMiddleware, assertValidTexNo, asSerialNumbers, asUniqueSerialHeatNumbers, normalizeWheelDataKey }) {
  const router = express.Router();
  router.use(authMiddleware, (req, res, next) => {
    if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Only master admin can edit or delete wagon data." });
    next();
  });
  const handle = (fn) => async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.rowId)) fail(400, "Invalid record ID.");
      await fn(req, res);
    } catch (error) {
      res.status(error.status || (error.code === 11000 ? 409 : 400)).json({ success: false, message: error.code === 11000 ? "A record with the same wheel data link, diameter and make already exists." : error.message });
    }
  };
  const load = async (id, session = null) => {
    const row = await Row.findById(id).session(session);
    if (!row) fail(404, "Record no longer exists. Refresh your search.");
    return row;
  };
  const checkVersion = (row, version) => {
    if (!version || new Date(version).getTime() !== new Date(row.updatedAt).getTime()) fail(409, "This record changed. Close this dialog and reopen it before continuing.");
  };
  router.get("/:rowId", handle(async (req, res) => {
    const row = await load(req.params.rowId);
    const linkedIds = [...(row.firstZone?.bogie1WheelDataRows || []), ...(row.firstZone?.bogie2WheelDataRows || [])].map((link) => link.rowId).filter(Boolean);
    const linked = await Row.find({ _id: { $in: linkedIds } }).select("wheelDataKey texNo").lean();
    res.json({ success: true, data: { rowId: String(row._id), updatedAt: row.updatedAt, label: row.texNo || row.wheelDataKey, fields, values: Object.fromEntries(fields.map((field) => {
      const value = readPath(row, field.path);
      return [field.path, Array.isArray(value) ? value.join("\n") : value || ""];
    })), linkedRecords: linked.map((item) => ({ rowId: String(item._id), label: item.texNo || item.wheelDataKey })) } });
  }));
  router.patch("/:rowId", handle(async (req, res) => {
    const changes = req.body.changes;
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) fail(400, "Changes are required.");
    const allowed = new Map(fields.map((field) => [field.path, field]));
    for (const [path, value] of Object.entries(changes)) {
      if (!allowed.has(path) || typeof value !== "string") fail(400, `Invalid editable field: ${path}`);
    }
    await mongoose.connection.transaction(async (session) => {
      const row = await load(req.params.rowId, session);
      checkVersion(row, req.body.updatedAt);
      const oldKey = row.wheelDataKey;
      const oldTex = row.texNo;
      for (const [path, value] of Object.entries(changes)) {
        const field = allowed.get(path);
        if (field.multiline) {
          const values = value.split(/\r?\n|,/).map((item) => item.trim());
          if (values.length > 8) fail(400, `${field.label}: enter at most 8 values.`);
          row.set(path, path.endsWith("HeatNumbers") ? values : asSerialNumbers(value, field.label, /^secondZone\.(axle|wheel)\./.test(path)));
        } else row.set(path, value.trim());
      }
      if (Object.hasOwn(changes, "texNo")) row.texNo = assertValidTexNo(changes.texNo, Boolean(oldTex), oldTex);
      row.wheelDataKey = normalizeWheelDataKey(row.wheelDataKey);
      if (!row.wheelDataKey) fail(400, "Wheel Data Link is required.");
      for (const key of ["axle", "wheel"]) {
        const serialPath = `secondZone.${key}.serialNumbers`;
        const heatPath = `secondZone.${key}HeatNumbers`;
        if (Object.hasOwn(changes, serialPath) || Object.hasOwn(changes, heatPath)) {
          row.set(heatPath, asUniqueSerialHeatNumbers(row.get(heatPath), changes[serialPath] ?? row.get(serialPath), key));
        }
      }
      if (Object.keys(changes).some((path) => /^firstZone\.bogie[12](Make|SerialNumber)$/.test(path))) {
        row.set("firstZone.bogie.make", row.firstZone.bogie1Make);
        row.set("firstZone.bogie.serialNumbers", [row.firstZone.bogie1SerialNumber, row.firstZone.bogie2SerialNumber].filter(Boolean));
      }
      for (const path of ["texNo", "wagonNo"]) {
        if (!Object.hasOwn(changes, path) || !row[path]) continue;
        const escaped = row[path].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const duplicate = await Row.findOne({ _id: { $ne: row._id }, ...(path === "texNo" ? { projectId: row.projectId } : {}), [path]: new RegExp(`^${escaped}$`, "i") }).session(session);
        if (duplicate) fail(409, `${allowed.get(path).label} already exists${path === "texNo" ? " in this project" : ""}.`);
      }
      await row.save({ session });
      if (oldKey !== row.wheelDataKey) {
        for (const path of ["firstZone.bogie1WheelDataRows", "firstZone.bogie2WheelDataRows"]) {
          await Row.updateMany({ [`${path}.rowId`]: row._id }, { $set: { [`${path}.$[link].wheelDataKey`]: row.wheelDataKey } }, { session, arrayFilters: [{ "link.rowId": row._id }] });
        }
      }
    });
    res.json({ success: true, message: "Record updated." });
  }));
  router.delete("/:rowId", handle(async (req, res) => {
    await mongoose.connection.transaction(async (session) => {
      const row = await load(req.params.rowId, session);
      checkVersion(row, req.body.updatedAt);
      await Row.updateMany({ $or: [{ "firstZone.bogie1WheelDataRows.rowId": row._id }, { "firstZone.bogie2WheelDataRows.rowId": row._id }] }, { $pull: { "firstZone.bogie1WheelDataRows": { rowId: row._id }, "firstZone.bogie2WheelDataRows": { rowId: row._id } } }, { session });
      await Row.updateMany({ "wheelDataUsage.linkedProjectRowId": row._id }, { $set: { "wheelDataUsage.linkedProjectRowId": null, "wheelDataUsage.linkedProjectId": null, "wheelDataUsage.linkedBogiePosition": "", "wheelDataUsage.linkedAt": null } }, { session });
      await Row.deleteOne({ _id: row._id }, { session });
    });
    res.json({ success: true, message: "Record deleted." });
  }));
  return router;
};
