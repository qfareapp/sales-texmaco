const express = require("express");
const InspectorAccount = require("../models/InspectorAccount");
const { hashPassword } = require("../utils/passwords");

const router = express.Router();

const asText = (value) => String(value || "").trim();
const normalizeUsername = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

const DEFAULT_INSPECTORS = [
  { slNo: 1, name: "NANDITA SIL", jobRole: "RFID + DOCUMENTATION", bay: "", agency: "TREL" },
  { slNo: 2, name: "SANJIT MONDAL", jobRole: "RDSO DOCUMENTATION", bay: "", agency: "TREL" },
  { slNo: 3, name: "DIP CHAKRABORTY", jobRole: "DM DOCUMENTATION", bay: "", agency: "SGS" },
  { slNo: 4, name: "SHUVAM PAUL", jobRole: "CHECK SHEET + Cal. Rec.", bay: "", agency: "TREL" },
  { slNo: 5, name: "APURBA MANDAL", jobRole: "CHECK SHEET", bay: "BCNA", agency: "TREL" },
  { slNo: 6, name: "PRASENJIT ORAON", jobRole: "DM LINE BLSS", bay: "DM LINE", agency: "QUEST" },
  { slNo: 7, name: "ARINDAM GHOSH", jobRole: "DM LINE FMP", bay: "DM LINE", agency: "QUEST" },
  { slNo: 8, name: "SOURAV DAS", jobRole: "BOGIE, CHECK SHEET", bay: "BOBRN", agency: "SGS" },
  { slNo: 9, name: "ADARSHABRATA CHOWDHURY", jobRole: "CTRB, BLSS PDI REPORT", bay: "", agency: "SGS" },
  { slNo: 10, name: "SWAPNIL BASU", jobRole: "BOBRN", bay: "2,3", agency: "QUEST" },
  { slNo: 11, name: "BABU ADHIKARY", jobRole: "BCBFG, CHECK SHEET", bay: "4", agency: "SGS" },
  { slNo: 12, name: "SHOUVIK BOSE", jobRole: "BCBFG", bay: "4", agency: "SGS" },
  { slNo: 13, name: "S.K AFRIDI ALI", jobRole: "BTAP", bay: "4", agency: "TREL" },
  { slNo: 14, name: "SOUVIK DESMUKH", jobRole: "BLSS, G- SHIFT", bay: "5", agency: "SGS" },
  { slNo: 15, name: "UTSAB JANA", jobRole: "BLSS-NIGHT-SHIFT", bay: "5 + ALL", agency: "SGS" },
  { slNo: 16, name: "AZARUDDIN MONDAL", jobRole: "BLCS", bay: "6", agency: "TREL" },
  { slNo: 17, name: "SANDIP BAIRAGI", jobRole: "FMP B shift", bay: "7", agency: "SGS" },
  { slNo: 18, name: "SUMAN DAS", jobRole: "CAMELCO", bay: "8", agency: "SGS" },
  { slNo: 19, name: "KRISHNENDU MAITY", jobRole: "CAMELCO", bay: "8", agency: "SGS" },
  { slNo: 20, name: "MRIGANKA SEAL", jobRole: "CAMELCO", bay: "8", agency: "SGS" },
  { slNo: 21, name: "SATYAM KUMAR", jobRole: "CTRB + OUT STATION", bay: "", agency: "TREL" },
];
const generatePassword = (length = 10) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#%";
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

const serializeInspector = (doc) => ({
  _id: String(doc._id),
  slNo: doc.slNo || 0,
  name: doc.name || "",
  jobRole: doc.jobRole || "",
  bay: doc.bay || "",
  agency: doc.agency || "",
  username: doc.username || "",
  isActive: Boolean(doc.isActive),
  hasPassword: Boolean(doc.passwordHash && doc.passwordSalt),
  mustChangePassword: Boolean(doc.mustChangePassword),
  updatedAt: doc.updatedAt || null,
});

const generateUniqueUsername = async (name, excludeId = "") => {
  const base = normalizeUsername(name) || "inspector";
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await InspectorAccount.findOne({
      username: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select("_id")
      .lean();

    if (!existing) return candidate;
    counter += 1;
    candidate = `${base}.${counter}`;
  }
};

router.get("/", async (_req, res) => {
  try {
    const inspectors = await InspectorAccount.find().sort({ slNo: 1, name: 1 }).lean();
    res.json({ success: true, data: inspectors.map(serializeInspector) });
  } catch (error) {
    console.error("Error fetching inspector accounts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = asText(req.body.name);
    const jobRole = asText(req.body.jobRole);
    const bay = asText(req.body.bay);
    const agency = asText(req.body.agency);
    const requestedUsername = normalizeUsername(req.body.username);
    const slNo = Number.parseInt(req.body.slNo, 10) || 0;
    const isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : true;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    if (!requestedUsername) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }

    const duplicateName = await InspectorAccount.findOne({ name, agency }).select("_id").lean();
    if (duplicateName) {
      return res.status(400).json({ success: false, message: "Inspector with the same name and agency already exists." });
    }

    const duplicateUsername = await InspectorAccount.findOne({ username: requestedUsername }).select("_id").lean();
    if (duplicateUsername) {
      return res.status(400).json({ success: false, message: "Username already exists." });
    }

    const generatedPassword = generatePassword();
    const { salt, hash } = hashPassword(generatedPassword);
    const inspector = await InspectorAccount.create({
      slNo,
      name,
      jobRole,
      bay,
      agency,
      username: requestedUsername,
      passwordSalt: salt,
      passwordHash: hash,
      mustChangePassword: true,
      isActive,
    });

    res.status(201).json({
      success: true,
      data: serializeInspector(inspector),
      generatedPassword,
      message: "Inspector created successfully.",
    });
  } catch (error) {
    console.error("Error creating inspector account:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/load-defaults", async (_req, res) => {
  try {
    const generatedPasswords = [];

    for (const inspector of DEFAULT_INSPECTORS) {
      const existing = await InspectorAccount.findOne({
        name: inspector.name,
        agency: inspector.agency,
      });

      if (existing) {
        existing.slNo = inspector.slNo;
        existing.jobRole = inspector.jobRole;
        existing.bay = inspector.bay;
        existing.agency = inspector.agency;
        if (!existing.username) {
          existing.username = await generateUniqueUsername(inspector.name, String(existing._id));
        }
        if (!existing.passwordHash || !existing.passwordSalt) {
          const generatedPassword = generatePassword();
          const { salt, hash } = hashPassword(generatedPassword);
          existing.passwordSalt = salt;
          existing.passwordHash = hash;
          existing.mustChangePassword = true;
          generatedPasswords.push({ name: existing.name, username: existing.username, password: generatedPassword });
        }
        await existing.save();
      } else {
        const generatedPassword = generatePassword();
        const { salt, hash } = hashPassword(generatedPassword);
        const username = await generateUniqueUsername(inspector.name);
        await InspectorAccount.create({
          ...inspector,
          username,
          passwordSalt: salt,
          passwordHash: hash,
          mustChangePassword: true,
        });
        generatedPasswords.push({ name: inspector.name, username, password: generatedPassword });
      }
    }

    const inspectors = await InspectorAccount.find().sort({ slNo: 1, name: 1 }).lean();
    res.json({ success: true, data: inspectors.map(serializeInspector), generatedPasswords });
  } catch (error) {
    console.error("Error loading default inspector accounts:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/:inspectorId", async (req, res) => {
  try {
    const { inspectorId } = req.params;
    const inspector = await InspectorAccount.findById(inspectorId);
    if (!inspector) {
      return res.status(404).json({ success: false, message: "Inspector not found." });
    }

    const nextUsername = normalizeUsername(req.body.username);
    if (!nextUsername) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }

    const duplicate = await InspectorAccount.findOne({
      username: nextUsername,
      _id: { $ne: inspector._id },
    })
      .select("_id")
      .lean();

    if (duplicate) {
      return res.status(400).json({ success: false, message: "Username already exists." });
    }

    inspector.slNo = Number.parseInt(req.body.slNo, 10) || inspector.slNo;
    inspector.name = asText(req.body.name);
    inspector.jobRole = asText(req.body.jobRole);
    inspector.bay = asText(req.body.bay);
    inspector.agency = asText(req.body.agency);
    inspector.username = nextUsername;
    inspector.isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : inspector.isActive;

    await inspector.save();
    res.json({ success: true, data: serializeInspector(inspector) });
  } catch (error) {
    console.error("Error updating inspector account:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/:inspectorId/reset-password", async (req, res) => {
  try {
    const { inspectorId } = req.params;
    const inspector = await InspectorAccount.findById(inspectorId);
    if (!inspector) {
      return res.status(404).json({ success: false, message: "Inspector not found." });
    }

    const generatedPassword = generatePassword();
    const { salt, hash } = hashPassword(generatedPassword);
    inspector.passwordSalt = salt;
    inspector.passwordHash = hash;
    inspector.mustChangePassword = true;
    await inspector.save();

    res.json({
      success: true,
      data: serializeInspector(inspector),
      generatedPassword,
      message: "Temporary password reset successfully.",
    });
  } catch (error) {
    console.error("Error resetting inspector password:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
