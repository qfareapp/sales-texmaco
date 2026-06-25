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
const PDI_STAGES = [
  { key: "weld_visual_clear_by_tpi", label: "Weld Visual Clear by TPI" },
  { key: "pipe_infringement_clear_by_tpi", label: "Pipe Infringement Clear by TPI" },
  { key: "air_brake_clear_by_tpi", label: "Air Brake Clear by TPI" },
  { key: "hand_brake_clear_by_tpi", label: "Hand Brake Clear by TPI" },
  { key: "lsd_gap_clear_by_tpi", label: "LSD Gap Clear by TPI" },
  { key: "coupler_articulation_and_operation", label: "Coupler Articulation & Operation" },
  { key: "apd_pdi_clear_by_tpi", label: "APD / PDI Clear by TPI" },
  { key: "painting_clear_by_tpi", label: "Painting Clear by TPI" },
  { key: "lettring_clear_by_tpi", label: "Lettring Clear by TPI" },
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
const createDefaultPdiStages = () =>
  PDI_STAGES.map((stage) => ({
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
const getPdiProgress = (row) => {
  const sourceStages = Array.isArray(row?.pdiProgress?.stages) && row.pdiProgress.stages.length
    ? row.pdiProgress.stages
    : [];
  const stageMap = new Map(sourceStages.map((stage) => [stage.key, stage]));
  const stages = PDI_STAGES.map((stage) => {
    const existingStage = stageMap.get(stage.key);
    return {
      key: stage.key,
      label: stage.label,
      completedOn: asText(existingStage?.completedOn),
      completedBy: existingStage?.completedBy || { username: "", role: "" },
    };
  });
  const completedStages = stages.filter((stage) => stage.completedOn);
  const isActivated = Boolean(row?.pdiProgress?.isActivated);
  const requestedIndex = Number.isInteger(row?.pdiProgress?.currentStageIndex)
    ? row.pdiProgress.currentStageIndex
    : isActivated
    ? completedStages.length
    : -1;
  const currentStageIndex = !isActivated
    ? -1
    : Math.min(PDI_STAGES.length, Math.max(completedStages.length, requestedIndex, 0));

  return {
    stages,
    currentStageIndex,
    lastCompletedStageKey: completedStages[completedStages.length - 1]?.key || "",
    lastCompletedOn: completedStages[completedStages.length - 1]?.completedOn || "",
    activeStage: currentStageIndex >= 0 && currentStageIndex < PDI_STAGES.length ? PDI_STAGES[currentStageIndex] : null,
    isFullyCompleted: isActivated && currentStageIndex >= PDI_STAGES.length,
    isActivated,
  };
};
const buildStageDashboardRow = (row) => {
  const progress = getInspectionProgress(row);
  const pdiProgress = getPdiProgress(row);
  return {
    ...row,
    inspectionProgress: {
      stages: progress.stages,
      currentStageIndex: progress.currentStageIndex,
      lastCompletedStageKey: progress.lastCompletedStageKey,
      lastCompletedOn: progress.lastCompletedOn,
    },
    pdiProgress: {
      stages: pdiProgress.stages,
      currentStageIndex: pdiProgress.currentStageIndex,
      lastCompletedStageKey: pdiProgress.lastCompletedStageKey,
      lastCompletedOn: pdiProgress.lastCompletedOn,
      isActivated: pdiProgress.isActivated,
    },
    activeStage: progress.activeStage,
    isFullyCompleted: progress.isFullyCompleted,
    activePdiStage: pdiProgress.activeStage,
    isPdiCompleted: pdiProgress.isFullyCompleted,
    isPdiActivated: pdiProgress.isActivated,
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
const buildPdiCounts = (rows) => {
  const counts = PDI_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    pendingCount: 0,
    completedCount: 0,
  }));

  rows.forEach((row) => {
    const pdiProgress = getPdiProgress(row);
    pdiProgress.stages.forEach((stage, index) => {
      if (stage.completedOn) {
        counts[index].completedCount += 1;
      }
    });
    if (pdiProgress.activeStage) {
      const activeIndex = PDI_STAGES.findIndex((stage) => stage.key === pdiProgress.activeStage.key);
      if (activeIndex >= 0) {
        counts[activeIndex].pendingCount += 1;
      }
    }
  });

  return counts;
};
const parseStageDate = (value) => {
  const text = asText(value);
  if (!text) return null;
  const date = new Date(`${text}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const diffInDays = (fromDate, toDate = new Date()) => {
  if (!(fromDate instanceof Date) || Number.isNaN(fromDate.getTime())) return null;
  return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
};
const getStageReferenceDate = (row, pdiMode = false) => {
  const progress = pdiMode ? getPdiProgress(row) : getInspectionProgress(row);
  const completedDates = progress.stages
    .map((stage) => parseStageDate(stage.completedOn))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  if (completedDates.length) {
    return completedDates[0];
  }
  return row?.createdAt ? new Date(row.createdAt) : null;
};
const flattenCompletionEvents = (row) => {
  const dailyEvents = getInspectionProgress(row).stages
    .filter((stage) => stage.completedOn && asText(stage?.completedBy?.username))
    .map((stage) => ({
      type: "daily-stage",
      stageKey: stage.key,
      stageLabel: stage.label,
      date: stage.completedOn,
      username: asText(stage?.completedBy?.username),
      role: asText(stage?.completedBy?.role),
      texNo: asText(row?.texNo),
      projectId: String(row?.projectId || ""),
    }));

  const pdiEvents = getPdiProgress(row).stages
    .filter((stage) => stage.completedOn && asText(stage?.completedBy?.username))
    .map((stage) => ({
      type: "pdi-stage",
      stageKey: stage.key,
      stageLabel: stage.label,
      date: stage.completedOn,
      username: asText(stage?.completedBy?.username),
      role: asText(stage?.completedBy?.role),
      texNo: asText(row?.texNo),
      projectId: String(row?.projectId || ""),
    }));

  const formEvents = [
    row?.firstZone?.submittedAt && asText(row?.firstZone?.submittedBy?.username)
      ? {
          type: "zone-2-form",
          stageKey: "zone_2_form",
          stageLabel: "Zone 2 Form",
          date: formatStageDate(new Date(row.firstZone.submittedAt)),
          username: asText(row?.firstZone?.submittedBy?.username),
          role: asText(row?.firstZone?.submittedBy?.role),
          texNo: asText(row?.texNo),
          projectId: String(row?.projectId || ""),
        }
      : null,
    row?.secondZone?.submittedAt && asText(row?.secondZone?.submittedBy?.username)
      ? {
          type: "zone-1-form",
          stageKey: "zone_1_form",
          stageLabel: "Zone 1 Form",
          date: formatStageDate(new Date(row.secondZone.submittedAt)),
          username: asText(row?.secondZone?.submittedBy?.username),
          role: asText(row?.secondZone?.submittedBy?.role),
          texNo: asText(row?.texNo),
          projectId: String(row?.projectId || ""),
        }
      : null,
    row?.finalAssembly?.submittedAt && asText(row?.finalAssembly?.submittedBy?.username)
      ? {
          type: "zone-3-form",
          stageKey: "zone_3_form",
          stageLabel: "Zone 3 Form",
          date: formatStageDate(new Date(row.finalAssembly.submittedAt)),
          username: asText(row?.finalAssembly?.submittedBy?.username),
          role: asText(row?.finalAssembly?.submittedBy?.role),
          texNo: asText(row?.texNo),
          projectId: String(row?.projectId || ""),
        }
      : null,
  ].filter(Boolean);

  return [...dailyEvents, ...pdiEvents, ...formEvents];
};
const hasCompletedStage = (row, stageKey) =>
  getInspectionProgress(row).stages.some((stage) => stage.key === stageKey && stage.completedOn);
const isPdiActivated = (row) => getPdiProgress(row).isActivated;
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
        const pdiCounts = buildPdiCounts(rows);
        const completedRows = rows.filter((row) => getInspectionProgress(row).isFullyCompleted).length;
        return {
          ...project,
          totalRows: rows.length,
          completedRows,
          pendingRows: rows.length - completedRows,
          finalCompletedRows: completedRows,
          finalPendingRows: stageCounts.find((stage) => stage.key === "dm_line")?.pendingCount || 0,
          stageCounts,
          pdiCounts,
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
        pdiStages: PDI_STAGES,
        stageCounts: buildStageCounts(rows),
        pdiStageCounts: buildPdiCounts(rows),
        rows: dashboardRows,
      },
    });
  } catch (error) {
    console.error("Error fetching wagon stage dashboard:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/analytics/overview", async (_req, res) => {
  try {
    const [projects, rows] = await Promise.all([
      WagonDataSheetProject.find().sort({ createdAt: -1 }).lean(),
      WagonDataSheetRow.find({ projectId: { $ne: null } }).sort({ createdAt: 1 }).lean(),
    ]);

    const projectMap = new Map(projects.map((project) => [String(project._id), project]));
    const today = new Date();
    const todayText = formatStageDate(today);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const rowsWithProgress = rows.map((row) => {
      const inspection = getInspectionProgress(row);
      const pdi = getPdiProgress(row);
      const project = projectMap.get(String(row.projectId || "")) || null;
      const currentStageAgeDays = inspection.activeStage ? diffInDays(getStageReferenceDate(row, false), today) : null;
      const currentPdiAgeDays = pdi.activeStage ? diffInDays(getStageReferenceDate(row, true), today) : null;
      return {
        ...row,
        project,
        inspection,
        pdi,
        currentStageAgeDays,
        currentPdiAgeDays,
      };
    });

    const stageCounts = buildStageCounts(rows);
    const pdiStageCounts = buildPdiCounts(rows);
    const completionEvents = rowsWithProgress.flatMap(flattenCompletionEvents);

    const overall = {
      totalProjects: projects.length,
      totalTexNos: rowsWithProgress.filter((row) => asText(row.texNo)).length,
      totalWagonInspections: rowsWithProgress.length,
      dailyInProgress: rowsWithProgress.filter((row) => row.inspection.activeStage).length,
      pdiInProgress: rowsWithProgress.filter((row) => row.pdi.activeStage).length,
      fullyCompletedWagons: rowsWithProgress.filter((row) => !row.inspection.activeStage).length,
      completionPercent: rowsWithProgress.length
        ? Number(((rowsWithProgress.filter((row) => !row.inspection.activeStage).length / rowsWithProgress.length) * 100).toFixed(1))
        : 0,
      reachedDmLine: rowsWithProgress.filter((row) => row.pdi.isActivated).length,
      waitingInPdi: rowsWithProgress.filter((row) => row.pdi.isActivated && row.pdi.activeStage).length,
      finalPdiCleared: rowsWithProgress.filter((row) => row.pdi.isFullyCompleted).length,
      readyForZone2: rowsWithProgress.filter((row) => row.pdi.isActivated).length,
      zone2Started: rowsWithProgress.filter((row) => row.firstZone?.submittedAt).length,
      zone2Completed: rowsWithProgress.filter((row) => row.firstZone?.submittedAt).length,
      fullyDocumented: rowsWithProgress.filter((row) => row.pdi.isFullyCompleted && row.firstZone?.submittedAt && row.finalAssembly?.submittedAt).length,
      inspectionsCompletedToday: completionEvents.filter((event) => event.date === todayText).length,
      inspectionsCompletedThisWeek: completionEvents.filter((event) => {
        const date = parseStageDate(event.date);
        return date && date >= weekAgo;
      }).length,
    };

    const projectPerformance = projects.map((project) => {
      const projectRows = rowsWithProgress.filter((row) => String(row.projectId || "") === String(project._id));
      const completed = projectRows.filter((row) => !row.inspection.activeStage).length;
      const readyForZone2 = projectRows.filter((row) => row.pdi.isActivated).length;
      return {
        projectId: String(project._id),
        projectName: project.projectName || "Untitled Project",
        contractPoNumber: project.contractPoNumber || "",
        totalTexNos: projectRows.length,
        dailyPending: projectRows.filter((row) => row.inspection.activeStage).length,
        pdiPending: projectRows.filter((row) => row.pdi.activeStage).length,
        completed,
        readyForZone2,
        completionPercent: projectRows.length ? Number(((completed / projectRows.length) * 100).toFixed(1)) : 0,
      };
    });

    const cycleDurations = rowsWithProgress
      .map((row) => {
        const firstDaily = parseStageDate(row.inspection.stages[0]?.completedOn);
        const dmComplete = parseStageDate(row.inspection.stages.find((stage) => stage.key === "dm_line")?.completedOn);
        const firstPdi = parseStageDate(row.pdi.stages[0]?.completedOn);
        const finalPdi = parseStageDate(row.pdi.lastCompletedOn);
        return {
          ufToDmDays: firstDaily && dmComplete ? diffInDays(firstDaily, dmComplete) : null,
          dmToPdiCloseDays: firstPdi && finalPdi ? diffInDays(firstPdi, finalPdi) : null,
          totalCycleDays: firstDaily && dmComplete ? diffInDays(firstDaily, dmComplete) : null,
        };
      })
      .filter(Boolean);

    const average = (values) => {
      const clean = values.filter((value) => Number.isFinite(value));
      return clean.length ? Number((clean.reduce((sum, value) => sum + value, 0) / clean.length).toFixed(1)) : 0;
    };

    const pendingRows = rowsWithProgress.filter((row) => row.inspection.activeStage || row.pdi.activeStage);
    const oldestPendingRow = [...pendingRows]
      .sort((a, b) => {
        const aAge = Math.max(a.currentStageAgeDays || 0, a.currentPdiAgeDays || 0);
        const bAge = Math.max(b.currentStageAgeDays || 0, b.currentPdiAgeDays || 0);
        return bAge - aAge;
      })[0] || null;

    const aging = {
      averageUfToDmDays: average(cycleDurations.map((item) => item.ufToDmDays)),
      averageDmToPdiCloseDays: average(cycleDurations.map((item) => item.dmToPdiCloseDays)),
      averageTotalCycleDays: average(cycleDurations.map((item) => item.totalCycleDays)),
      oldestPending: oldestPendingRow
        ? {
            texNo: oldestPendingRow.texNo || "New Wagon",
            projectName: oldestPendingRow.project?.projectName || "",
            currentStage: oldestPendingRow.pdi.activeStage?.label || oldestPendingRow.inspection.activeStage?.label || "Completed",
            ageDays: Math.max(oldestPendingRow.currentStageAgeDays || 0, oldestPendingRow.currentPdiAgeDays || 0),
          }
        : null,
      pendingOver3Days: pendingRows.filter((row) => Math.max(row.currentStageAgeDays || 0, row.currentPdiAgeDays || 0) > 3).length,
      pendingOver7Days: pendingRows.filter((row) => Math.max(row.currentStageAgeDays || 0, row.currentPdiAgeDays || 0) > 7).length,
      stalledWagons: pendingRows
        .filter((row) => Math.max(row.currentStageAgeDays || 0, row.currentPdiAgeDays || 0) > 3)
        .slice(0, 10)
        .map((row) => ({
          texNo: row.texNo || "New Wagon",
          projectName: row.project?.projectName || "",
          currentStage: row.pdi.activeStage?.label || row.inspection.activeStage?.label || "Completed",
          ageDays: Math.max(row.currentStageAgeDays || 0, row.currentPdiAgeDays || 0),
        })),
    };

    const inspectorMap = new Map();
    completionEvents.forEach((event) => {
      if (!event.username) return;
      if (!inspectorMap.has(event.username)) {
        inspectorMap.set(event.username, {
          username: event.username,
          role: event.role || "",
          totalCompletions: 0,
          dailyStageCompletions: 0,
          pdiStageCompletions: 0,
          formSubmissions: 0,
          completedToday: 0,
          completedThisWeek: 0,
        });
      }
      const inspector = inspectorMap.get(event.username);
      inspector.totalCompletions += 1;
      if (event.type === "daily-stage") inspector.dailyStageCompletions += 1;
      if (event.type === "pdi-stage") inspector.pdiStageCompletions += 1;
      if (event.type.includes("form")) inspector.formSubmissions += 1;
      if (event.date === todayText) inspector.completedToday += 1;
      const eventDate = parseStageDate(event.date);
      if (eventDate && eventDate >= weekAgo) inspector.completedThisWeek += 1;
    });

    const stageCompletionsByInspector = [...inspectorMap.values()].sort((a, b) => b.totalCompletions - a.totalCompletions);

    const texFrequency = new Map();
    rowsWithProgress.forEach((row) => {
      const texNo = asText(row.texNo);
      if (!texNo) return;
      texFrequency.set(texNo.toUpperCase(), (texFrequency.get(texNo.toUpperCase()) || 0) + 1);
    });

    const dataQuality = {
      rowsWithoutTexNo: rowsWithProgress.filter((row) => !asText(row.texNo)).length,
      duplicateTexNos: [...texFrequency.entries()]
        .filter(([, count]) => count > 1)
        .map(([texNo, count]) => ({ texNo, count })),
      rowsStuckWithoutActiveStage: rowsWithProgress.filter((row) => !row.inspection.activeStage && !row.pdi.isFullyCompleted).length,
      rowsReachedPdiButNotActivated: rowsWithProgress.filter((row) => row.inspection.activeStage?.key === "dm_line" && !row.pdi.isActivated).length,
      zone2PendingThoughEligible: rowsWithProgress.filter((row) => row.pdi.isActivated && !row.firstZone?.submittedAt).length,
      incompleteRequiredForms: rowsWithProgress.filter((row) => row.firstZone?.submittedAt && (!asText(row.wagonConfiguration) || !asText(row.wagonNo))).length,
    };

    res.json({
      success: true,
      data: {
        overall,
        stageCounts,
        pdiStageCounts,
        projectPerformance,
        aging,
        stageCompletionsByInspector,
        dataQuality,
      },
    });
  } catch (error) {
    console.error("Error fetching wagon data sheet analytics overview:", error);
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

    if (!projectId) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const row = await WagonDataSheetRow.create({
      projectId,
      slNo: await getNextSlNo(projectId),
      texNo: "",
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

    if (stageKey === "uf_fit_up") {
      const texNo = asText(req.body.texNo);
      if (!texNo) {
        return res.status(400).json({ success: false, message: "TEX No. is required to complete U/F Fit-Up." });
      }

      await ensureUniqueWagonIdentifiers({
        rowId: row._id,
        texNo,
        wagonNo: row.wagonNo,
      });
      row.texNo = texNo;
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
    const completedStage = stages.find((stage) => stage.key === stageKey);
    const nextStageIndex = Math.min(progress.currentStageIndex + 1, INSPECTION_STAGES.length);

    row.inspectionProgress = {
      stages,
      currentStageIndex: nextStageIndex,
      lastCompletedStageKey: stageKey,
      lastCompletedOn: completedStage?.completedOn || formatStageDate(),
    };

    if (stageKey === "container_test") {
      const currentPdi = getPdiProgress(row.toObject());
      row.pdiProgress = {
        stages: currentPdi.stages.length ? currentPdi.stages : createDefaultPdiStages(),
        currentStageIndex: currentPdi.isActivated ? currentPdi.currentStageIndex : 0,
        lastCompletedStageKey: currentPdi.lastCompletedStageKey || "",
        lastCompletedOn: currentPdi.lastCompletedOn || "",
        isActivated: true,
      };
    }

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error completing wagon stage:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/rows/:rowId/pdi-stages/:stageKey/complete", async (req, res) => {
  try {
    const { rowId, stageKey } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findById(rowId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    const dailyProgress = getInspectionProgress(row.toObject());
    const pdiProgress = getPdiProgress(row.toObject());

    if (!pdiProgress.isActivated) {
      return res.status(400).json({ success: false, message: "PDI stages are not activated yet for this TEX No." });
    }
    if (!pdiProgress.activeStage) {
      return res.status(400).json({ success: false, message: "All PDI stages are already completed." });
    }
    if (pdiProgress.activeStage.key !== stageKey) {
      return res.status(400).json({
        success: false,
        message: `Only the current PDI stage can be completed. Pending PDI stage: ${pdiProgress.activeStage.label}.`,
      });
    }

    const completedOn = asText(req.body.completedOn) || formatStageDate();
    const stages = pdiProgress.stages.map((stage) =>
      stage.key === stageKey
        ? {
            ...stage,
            completedOn,
            completedBy: asSubmittedBy(req.body),
          }
        : stage
    );
    const nextPdiIndex = Math.min(pdiProgress.currentStageIndex + 1, PDI_STAGES.length);

    row.pdiProgress = {
      stages,
      currentStageIndex: nextPdiIndex,
      lastCompletedStageKey: stageKey,
      lastCompletedOn: completedOn,
      isActivated: true,
    };

    if (nextPdiIndex >= PDI_STAGES.length && dailyProgress.currentStageIndex === INSPECTION_STAGES.length - 1) {
      const dailyStages = dailyProgress.stages.map((stage) =>
        stage.key === "dm_line"
          ? {
              ...stage,
              completedOn,
              completedBy: asSubmittedBy(req.body),
            }
          : stage
      );

      row.inspectionProgress = {
        stages: dailyStages,
        currentStageIndex: INSPECTION_STAGES.length,
        lastCompletedStageKey: "dm_line",
        lastCompletedOn: completedOn,
      };
    }

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error completing wagon PDI stage:", error);
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

    const rows = (await attachLinkedWheelDataRows(rawRows)).filter((row) => isPdiActivated(row));
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
