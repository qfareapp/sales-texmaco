const express = require("express");
const mongoose = require("mongoose");
const WagonDataSheetProject = require("../models/WagonDataSheetProject");
const WagonDataSheetRow = require("../models/WagonDataSheetRow");

const router = express.Router();

const asText = (value) => String(value || "").trim();
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const asSubmittedBy = (body) => ({
  username: asText(body?.submittedByUsername),
  role: asText(body?.submittedByRole),
});
const normalizeWheelDataKey = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
const normalizeSerialNumber = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
const INSPECTION_STAGES = [
  { key: "uf_fit_up", label: "U/F Fit-Up" },
  { key: "boxing", label: "Boxing" },
  { key: "manipulator_bmp", label: "Manipulator / BMP" },
  { key: "reverse_visual", label: "Reverse Visual" },
  { key: "top_visual_final_inspection", label: "Top Visual / Final Inspection" },
  { key: "blasting", label: "Blasting" },
  { key: "wheeling", label: "Wheeling" },
  { key: "container_test", label: "Container Test" },
  { key: "dm_line", label: "DM Line" },
];
const createInternalWheelDataKey = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const asProjectIdOrNull = (value) =>
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
const buildExactMatchRegex = (value) => new RegExp(`^${escapeRegex(asText(value))}$`, "i");
const formatStageDate = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
};
const createDefaultInspectionStages = () =>
  INSPECTION_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    completedOn: "",
    completedBy: { username: "", role: "" },
  }));
const getInspectionProgress = (row) => {
  const sourceStages = Array.isArray(row?.inspectionProgress?.stages) && row.inspectionProgress.stages.length
    ? row.inspectionProgress.stages
    : [];
  const stageMap = new Map(sourceStages.map((stage) => [stage.key, stage]));
  const stages = INSPECTION_STAGES.map((stage) => {
    const existingStage = stageMap.get(stage.key);
    return {
      key: stage.key,
      label: stage.label,
      completedOn: asText(existingStage?.completedOn),
      completedBy: existingStage?.completedBy || { username: "", role: "" },
    };
  });
  const completedStages = stages.filter((stage) => stage.completedOn);
  const requestedIndex = Number.isInteger(row?.inspectionProgress?.currentStageIndex)
    ? row.inspectionProgress.currentStageIndex
    : completedStages.length;
  const currentStageIndex = Math.min(
    INSPECTION_STAGES.length,
    Math.max(completedStages.length, requestedIndex, 0)
  );

  return {
    stages,
    currentStageIndex,
    lastCompletedStageKey: completedStages[completedStages.length - 1]?.key || "",
    lastCompletedOn: completedStages[completedStages.length - 1]?.completedOn || "",
    activeStage: currentStageIndex < INSPECTION_STAGES.length ? INSPECTION_STAGES[currentStageIndex] : null,
    isFullyCompleted: currentStageIndex >= INSPECTION_STAGES.length,
  };
};
const buildStageDashboardRow = (row) => {
  const progress = getInspectionProgress(row);
  return {
    ...row,
    inspectionProgress: {
      stages: progress.stages,
      currentStageIndex: progress.currentStageIndex,
      lastCompletedStageKey: progress.lastCompletedStageKey,
      lastCompletedOn: progress.lastCompletedOn,
    },
    activeStage: progress.activeStage,
    isFullyCompleted: progress.isFullyCompleted,
  };
};
const buildStageCounts = (rows) => {
  const counts = INSPECTION_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    pendingCount: 0,
    completedCount: 0,
  }));

  rows.forEach((row) => {
    const progress = getInspectionProgress(row);
    progress.stages.forEach((stage, index) => {
      if (stage.completedOn) {
        counts[index].completedCount += 1;
      }
    });
    if (progress.activeStage) {
      const activeIndex = INSPECTION_STAGES.findIndex((stage) => stage.key === progress.activeStage.key);
      if (activeIndex >= 0) {
        counts[activeIndex].pendingCount += 1;
      }
    }
  });

  return counts;
};
const findDuplicateSerialNumber = (values) => {
  const seen = new Set();

  for (const value of values) {
    const normalizedValue = normalizeSerialNumber(value);
    if (!normalizedValue) {
      continue;
    }
    if (seen.has(normalizedValue)) {
      return String(value || "").trim();
    }
    seen.add(normalizedValue);
  }

  return "";
};
const asSerialNumbers = (value, fieldLabel = "Serial numbers") => {
  const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n|,/);
  const serialNumbers = source
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);

  const duplicateSerialNumber = findDuplicateSerialNumber(serialNumbers);
  if (duplicateSerialNumber) {
    throw new Error(`${fieldLabel} must be unique within the same field. Duplicate serial number: ${duplicateSerialNumber}`);
  }

  return serialNumbers;
};
const asObjectIdList = (value, limit = 8) => {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => (mongoose.Types.ObjectId.isValid(item) ? new mongoose.Types.ObjectId(item) : null))
    .filter(Boolean)
    .slice(0, limit);
};
const getLinkedWheelIds = (row) => [
  ...(row?.firstZone?.bogie1WheelDataRows || []).map((item) => String(item?.rowId || "")),
  ...(row?.firstZone?.bogie2WheelDataRows || []).map((item) => String(item?.rowId || "")),
].filter(Boolean);
const attachLinkedWheelDataRows = async (rows) => {
  const wheelIds = [...new Set(rows.flatMap((row) => getLinkedWheelIds(row)))];
  if (wheelIds.length === 0) {
    return rows;
  }

  const wheelRows = await WagonDataSheetRow.find({ _id: { $in: wheelIds } }).lean();
  const wheelRowMap = new Map(wheelRows.map((row) => [String(row._id), row]));

  return rows.map((row) => ({
    ...row,
    linkedWheelDataRows: [
      ...(row?.firstZone?.bogie1WheelDataRows || []).map((item) => wheelRowMap.get(String(item?.rowId || ""))).filter(Boolean),
      ...(row?.firstZone?.bogie2WheelDataRows || []).map((item) => wheelRowMap.get(String(item?.rowId || ""))).filter(Boolean),
    ],
  }));
};

const getNextSlNo = async (projectId) => {
  const existingRows = await WagonDataSheetRow.find({ projectId }).select("slNo").lean();
  const maxSlNo = existingRows.reduce((maxValue, row) => {
    const numericValue = Number.parseInt(String(row?.slNo || ""), 10);
    return Number.isFinite(numericValue) ? Math.max(maxValue, numericValue) : maxValue;
  }, 0);

  return String(maxSlNo + 1);
};
const ensureUniqueWagonIdentifiers = async ({ rowId, texNo, wagonNo }) => {
  const duplicateChecks = [];
  const cleanTexNo = asText(texNo);
  const cleanWagonNo = asText(wagonNo);

  if (cleanTexNo) {
    duplicateChecks.push({ texNo: buildExactMatchRegex(cleanTexNo) });
  }
  if (cleanWagonNo) {
    duplicateChecks.push({ wagonNo: buildExactMatchRegex(cleanWagonNo) });
  }
  if (!duplicateChecks.length) {
    return;
  }

  const duplicateRows = await WagonDataSheetRow.find({
    ...(rowId ? { _id: { $ne: rowId } } : {}),
    $or: duplicateChecks,
  })
    .select("texNo wagonNo")
    .lean();

  if (cleanTexNo && duplicateRows.some((row) => asText(row.texNo).toUpperCase() === cleanTexNo.toUpperCase())) {
    throw new Error("TEX No. already filled.");
  }
  if (cleanWagonNo && duplicateRows.some((row) => asText(row.wagonNo).toUpperCase() === cleanWagonNo.toUpperCase())) {
    throw new Error("Wagon No. already filled.");
  }
};

router.get("/projects", async (_req, res) => {
  try {
    const projects = await WagonDataSheetProject.find().sort({ createdAt: -1 }).lean();
    const ids = projects.map((project) => project._id);
    const projectRows = ids.length
      ? await WagonDataSheetRow.find({ projectId: { $in: ids } }).lean()
      : [];
    const rowMap = new Map();

    projectRows.forEach((row) => {
      const key = String(row.projectId || "");
      if (!rowMap.has(key)) {
        rowMap.set(key, []);
      }
      rowMap.get(key).push(row);
    });

    res.json({
      success: true,
      data: projects.map((project) => {
        const rows = rowMap.get(String(project._id)) || [];
        const stageCounts = buildStageCounts(rows);
        const completedRows = rows.filter((row) => getInspectionProgress(row).isFullyCompleted).length;
        return {
          ...project,
          totalRows: rows.length,
          completedRows,
          pendingRows: rows.length - completedRows,
          finalCompletedRows: completedRows,
          finalPendingRows: stageCounts.find((stage) => stage.key === "dm_line")?.pendingCount || 0,
          stageCounts,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching wagon data sheet projects:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const payload = {
      projectName: asText(req.body.projectName),
      contractPoNumber: asText(req.body.contractPoNumber),
      contractPoDate: asText(req.body.contractPoDate),
      deliveryPeriodUpto: asText(req.body.deliveryPeriodUpto),
      totalQuantity: asText(req.body.totalQuantity),
      wagonTypeInPo: asText(req.body.wagonTypeInPo),
      contractPlacedBy: asText(req.body.contractPlacedBy),
      wagonManufacturer: asText(req.body.wagonManufacturer),
      wagonTypeOffered: asText(req.body.wagonTypeOffered),
      wagonsOfferedForInspection: asText(req.body.wagonsOfferedForInspection),
      inspectionOfferDate: asText(req.body.inspectionOfferDate),
      notes: asText(req.body.notes),
    };

    const project = await WagonDataSheetProject.create(payload);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error("Error creating wagon data sheet project:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/projects/:projectId/detail", async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const [project, rawRows] = await Promise.all([
      WagonDataSheetProject.findById(projectId).lean(),
      WagonDataSheetRow.find({ projectId }).sort({ createdAt: 1 }).lean(),
    ]);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const rows = (await attachLinkedWheelDataRows(rawRows)).map(buildStageDashboardRow);
    res.json({ success: true, data: { project, rows } });
  } catch (error) {
    console.error("Error fetching wagon data sheet project detail:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/projects/:projectId/stage-dashboard", async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const [project, rows] = await Promise.all([
      WagonDataSheetProject.findById(projectId).lean(),
      WagonDataSheetRow.find({ projectId }).sort({ createdAt: 1 }).lean(),
    ]);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const dashboardRows = rows.map(buildStageDashboardRow);
    res.json({
      success: true,
      data: {
        project,
        stages: INSPECTION_STAGES,
        stageCounts: buildStageCounts(rows),
        rows: dashboardRows,
      },
    });
  } catch (error) {
    console.error("Error fetching wagon stage dashboard:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const rows = await WagonDataSheetRow.find({ projectId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching wagon data sheet rows:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/rows/stage-entry", async (req, res) => {
  try {
    const projectId = asProjectIdOrNull(req.body.projectId);
    const texNo = asText(req.body.texNo);

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }
    if (!texNo) {
      return res.status(400).json({ success: false, message: "TEX No. is required." });
    }

    await ensureUniqueWagonIdentifiers({ texNo, wagonNo: "" });

    const existingRow = await WagonDataSheetRow.findOne({
      projectId,
      texNo: buildExactMatchRegex(texNo),
    })
      .select("_id")
      .lean();

    if (existingRow) {
      return res.status(400).json({ success: false, message: "TEX No. already exists in this project." });
    }

    const row = await WagonDataSheetRow.create({
      projectId,
      slNo: await getNextSlNo(projectId),
      texNo,
      wheelDataKey: createInternalWheelDataKey("STAGE"),
      inspectionProgress: {
        stages: createDefaultInspectionStages(),
        currentStageIndex: 0,
        lastCompletedStageKey: "",
        lastCompletedOn: "",
      },
    });

    res.status(201).json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error creating wagon stage entry:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/rows/:rowId/stages/:stageKey/complete", async (req, res) => {
  try {
    const { rowId, stageKey } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findById(rowId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    const progress = getInspectionProgress(row.toObject());
    const expectedStage = progress.activeStage;

    if (!expectedStage) {
      return res.status(400).json({ success: false, message: "All stages are already completed." });
    }
    if (expectedStage.key !== stageKey) {
      return res.status(400).json({
        success: false,
        message: `Only the current pending stage can be completed. Pending stage: ${expectedStage.label}.`,
      });
    }

    const stages = progress.stages.map((stage) =>
      stage.key === stageKey
        ? {
            ...stage,
            completedOn: asText(req.body.completedOn) || formatStageDate(),
            completedBy: asSubmittedBy(req.body),
          }
        : stage
    );

    row.inspectionProgress = {
      stages,
      currentStageIndex: Math.min(progress.currentStageIndex + 1, INSPECTION_STAGES.length),
      lastCompletedStageKey: stageKey,
      lastCompletedOn: stages.find((stage) => stage.key === stageKey)?.completedOn || formatStageDate(),
    };

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error completing wagon stage:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/rows/available-wheel-data", async (_req, res) => {
  try {
    const rows = await WagonDataSheetRow.find({
      projectId: null,
      "secondZone.submittedAt": { $ne: null },
      "wheelDataUsage.linkedProjectRowId": null,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching available wheel data rows:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows/pending-second-zone", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const rawRows = await WagonDataSheetRow.find({
      projectId,
      "firstZone.submittedAt": null,
    })
      .sort({ createdAt: -1 })
      .lean();

    const rows = await attachLinkedWheelDataRows(rawRows);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching pending second zone rows:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows/final-details-options", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const rawRows = await WagonDataSheetRow.find({
      projectId,
      "firstZone.submittedAt": { $ne: null },
    })
      .sort({ createdAt: -1 })
      .lean();

    const rows = await attachLinkedWheelDataRows(rawRows);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching final details options:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows/submissions", async (req, res) => {
  try {
    const username = asText(req.query.username);
    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }

    const rawRows = await WagonDataSheetRow.find({
      $or: [
        { "firstZone.submittedBy.username": username },
        { "secondZone.submittedBy.username": username },
        { "finalAssembly.submittedBy.username": username },
      ],
    })
      .sort({ updatedAt: -1 })
      .lean();

    const rows = await attachLinkedWheelDataRows(rawRows);
    const projectIds = [...new Set(rows.map((row) => String(row?.projectId || "")).filter(Boolean))];
    const projects = projectIds.length
      ? await WagonDataSheetProject.find({ _id: { $in: projectIds } }).lean()
      : [];
    const projectMap = new Map(projects.map((project) => [String(project._id), project]));

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        project: projectMap.get(String(row?.projectId || "")) || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching wagon data sheet submissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/rows/first-zone", async (req, res) => {
  try {
    const projectId = asProjectIdOrNull(req.body.projectId);
    const rowId = mongoose.Types.ObjectId.isValid(req.body.rowId) ? new mongoose.Types.ObjectId(req.body.rowId) : null;
    const bogie1WheelDataRowIds = asObjectIdList(req.body.bogie1WheelDataRowIds, 2);
    const bogie2WheelDataRowIds = asObjectIdList(req.body.bogie2WheelDataRowIds, 2);
    const selectedWheelIds = [...bogie1WheelDataRowIds, ...bogie2WheelDataRowIds];

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }
    if (bogie1WheelDataRowIds.length !== 2 || bogie2WheelDataRowIds.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Select exactly 2 wheel data entries for bogie 1 and 2 wheel data entries for bogie 2.",
      });
    }
    if (new Set(selectedWheelIds.map((item) => String(item))).size !== 4) {
      return res.status(400).json({ success: false, message: "Each wheel data selection must be unique." });
    }

    const [existingRow, selectedWheelRows] = await Promise.all([
      rowId ? WagonDataSheetRow.findById(rowId) : null,
      WagonDataSheetRow.find({ _id: { $in: selectedWheelIds } }),
    ]);

    if (rowId && !existingRow) {
      return res.status(404).json({ success: false, message: "Project wagon row not found." });
    }

    const selectedWheelRowMap = new Map(selectedWheelRows.map((row) => [String(row._id), row]));
    if (selectedWheelRows.length !== 4) {
      return res.status(400).json({ success: false, message: "Selected wheel data entries were not found." });
    }

    for (const wheelRowId of selectedWheelIds.map((item) => String(item))) {
      const wheelRow = selectedWheelRowMap.get(wheelRowId);
      const linkedProjectRowId = String(wheelRow?.wheelDataUsage?.linkedProjectRowId || "");
      const currentRowId = String(existingRow?._id || "");
      if (wheelRow?.projectId || !wheelRow?.secondZone?.submittedAt) {
        return res.status(400).json({ success: false, message: "Only independent first-zone wheel data can be linked." });
      }
      if (linkedProjectRowId && linkedProjectRowId !== currentRowId) {
        return res.status(400).json({ success: false, message: `Wheel data ${wheelRow.wheelDataKey} is already linked.` });
      }
    }

    const previousWheelIds = existingRow ? getLinkedWheelIds(existingRow.toObject()) : [];
    const texNo = asText(req.body.texNo);
    const wagonNo = asText(req.body.wagonNo);

    await ensureUniqueWagonIdentifiers({
      rowId: existingRow?._id || null,
      texNo,
      wagonNo,
    });

    const buildWheelLinkPayload = (ids) =>
      ids.map((item) => {
        const wheelRow = selectedWheelRowMap.get(String(item));
        return {
          rowId: wheelRow._id,
          wheelDataKey: wheelRow.wheelDataKey,
        };
      });

    const row = existingRow || new WagonDataSheetRow({
      projectId,
      wheelDataKey: createInternalWheelDataKey("WAGON"),
      slNo: await getNextSlNo(projectId),
    });

    row.projectId = projectId;
    row.texNo = texNo;
    row.wagonNo = wagonNo;
    row.wagonConfiguration = asText(req.body.wagonConfiguration);
    row.firstZone = {
      ...row.firstZone?.toObject?.(),
      bogie: {
        ...(row.firstZone?.bogie?.toObject?.() || {}),
        make: asText(req.body.bogieMake),
        serialNumbers: [asText(req.body.bogie1SerialNumber), asText(req.body.bogie2SerialNumber)].filter(Boolean),
      },
      bogie1SerialNumber: asText(req.body.bogie1SerialNumber),
      bogie2SerialNumber: asText(req.body.bogie2SerialNumber),
      bogie1WheelDataRows: buildWheelLinkPayload(bogie1WheelDataRowIds),
      bogie2WheelDataRows: buildWheelLinkPayload(bogie2WheelDataRowIds),
      coupler: {
        ...(row.firstZone?.coupler?.toObject?.() || {}),
        make: asText(req.body.couplerMake),
        serialNumbers: asSerialNumbers(req.body.couplerSerialNumbers, "Coupler serial numbers"),
      },
      draftGear: {
        ...(row.firstZone?.draftGear?.toObject?.() || {}),
        make: asText(req.body.draftGearMake),
        serialNumbers: asSerialNumbers(req.body.draftGearSerialNumbers, "Draft gear serial numbers"),
      },
      dv: {
        ...(row.firstZone?.dv?.toObject?.() || {}),
        make: asText(req.body.dvMake),
        serialNumbers: asSerialNumbers(req.body.dvSerialNumbers, "DV serial numbers"),
      },
      bc: {
        ...(row.firstZone?.bc?.toObject?.() || {}),
        make: asText(req.body.bcMake),
        serialNumbers: asSerialNumbers(req.body.bcSerialNumbers, "BC serial numbers"),
      },
      ar: {
        ...(row.firstZone?.ar?.toObject?.() || {}),
        make: asText(req.body.arMake),
        serialNumbers: asSerialNumbers(req.body.arSerialNumbers, "AR serial numbers"),
      },
      sabMake: asText(req.body.sabMake),
      atlMake: asText(req.body.atlMake),
      crfMake: asText(req.body.crfMake),
      submittedBy: asSubmittedBy(req.body),
      submittedAt: new Date(),
    };

    await row.save();

    const selectedWheelIdStrings = selectedWheelIds.map((item) => String(item));
    const releasedWheelIds = previousWheelIds.filter((item) => !selectedWheelIdStrings.includes(item));

    if (releasedWheelIds.length > 0) {
      await WagonDataSheetRow.updateMany(
        { _id: { $in: releasedWheelIds } },
        {
          $set: {
            "wheelDataUsage.linkedProjectRowId": null,
            "wheelDataUsage.linkedProjectId": null,
            "wheelDataUsage.linkedBogiePosition": "",
            "wheelDataUsage.linkedAt": null,
          },
        }
      );
    }

    await WagonDataSheetRow.bulkWrite([
      ...bogie1WheelDataRowIds.map((wheelRowId) => ({
        updateOne: {
          filter: { _id: wheelRowId },
          update: {
            $set: {
              "wheelDataUsage.linkedProjectRowId": row._id,
              "wheelDataUsage.linkedProjectId": projectId,
              "wheelDataUsage.linkedBogiePosition": "BOGIE_1",
              "wheelDataUsage.linkedAt": new Date(),
            },
          },
        },
      })),
      ...bogie2WheelDataRowIds.map((wheelRowId) => ({
        updateOne: {
          filter: { _id: wheelRowId },
          update: {
            $set: {
              "wheelDataUsage.linkedProjectRowId": row._id,
              "wheelDataUsage.linkedProjectId": projectId,
              "wheelDataUsage.linkedBogiePosition": "BOGIE_2",
              "wheelDataUsage.linkedAt": new Date(),
            },
          },
        },
      })),
    ]);

    res.status(existingRow ? 200 : 201).json({ success: true, data: row });
  } catch (error) {
    console.error("Error saving first zone row:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/rows/second-zone", async (req, res) => {
  try {
    const projectId = asProjectIdOrNull(req.body.projectId);
    const wheelDataKey = normalizeWheelDataKey(req.body.wheelDataKey);

    if (!wheelDataKey) {
      return res.status(400).json({ success: false, message: "Wheel data key is required." });
    }

    const existingRow = await WagonDataSheetRow.findOne({ projectId, wheelDataKey }).select("_id").lean();
    if (existingRow) {
      return res.status(400).json({
        success: false,
        message: `Duplicate entry. Wheel data key ${wheelDataKey} already exists.`,
      });
    }

    const row = await WagonDataSheetRow.create({
      projectId,
      wheelDataKey,
      slNo: await getNextSlNo(projectId),
      secondZone: {
        axle: {
          make: asText(req.body.axleMake),
          serialNumbers: asSerialNumbers(req.body.axleSerialNumbers, "Axle serial numbers"),
        },
        wheel: {
          make: asText(req.body.wheelMake),
          serialNumbers: asSerialNumbers(req.body.wheelSerialNumbers, "Wheel serial numbers"),
        },
        bearing: {
          make: asText(req.body.bearingMake),
          serialNumbers: asSerialNumbers(req.body.bearingSerialNumbers, "Bearing serial numbers"),
        },
        submittedBy: asSubmittedBy(req.body),
        submittedAt: new Date(),
      },
    });

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error("Error saving second zone row:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/rows/final-details", async (req, res) => {
  try {
    const { rowId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findByIdAndUpdate(
      rowId,
      {
        $set: {
          "finalAssembly.tareWeight": asText(req.body.tareWeight),
          "finalAssembly.txrFitDate": asText(req.body.txrFitDate),
          "finalAssembly.manufactureDate": asText(req.body.manufactureDate),
          "finalAssembly.rfidNo1": asText(req.body.rfidNo1),
          "finalAssembly.rfidNo2": asText(req.body.rfidNo2),
          "finalAssembly.dmNo": asText(req.body.dmNo),
          "finalAssembly.dmDate": asText(req.body.dmDate),
          "finalAssembly.rohDate": asText(req.body.rohDate),
          "finalAssembly.returnOrPohDate": asText(req.body.returnOrPohDate),
          "finalAssembly.submittedBy": asSubmittedBy(req.body),
          "finalAssembly.submittedAt": new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    console.error("Error saving final assembly details:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
