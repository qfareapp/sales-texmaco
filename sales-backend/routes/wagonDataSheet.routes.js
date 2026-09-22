const express = require("express");
const mongoose = require("mongoose");
const WagonDataSheetProject = require("../models/WagonDataSheetProject");
const WagonDataSheetDraft = require("../models/WagonDataSheetDraft");
const { authMiddleware } = require("./auth.routes");
const WagonDataSheetRow = require("../models/WagonDataSheetRow");
const WagonConfig = require("../models/WagonConfig");
const InspectorAccount = require("../models/InspectorAccount");

const router = express.Router();

const asText = (value) => String(value || "").trim();
const TEX_NO_PATTERN = /^[A-Za-z0-9]+$/;
const normalizeTexNo = (value) => asText(value).toUpperCase();
const assertValidTexNo = (value, required = false, existingTexNo = "") => {
  const enteredTexNo = asText(value);
  const legacyTexNo = asText(existingTexNo);
  // Existing records may predate the strict TEX format. Preserve them when unchanged.
  if (legacyTexNo && enteredTexNo === legacyTexNo) {
    return legacyTexNo;
  }

  const texNo = normalizeTexNo(enteredTexNo);
  if (!texNo && required) {
    throw new Error("TEX No. is required.");
  }
  if (texNo && !TEX_NO_PATTERN.test(texNo)) {
    throw new Error("TEX No. must contain only letters and numbers, with no spaces or special characters (example: B181).");
  }
  return texNo;
};
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
  { key: "pneumatic", label: "Pneumatic" },
  { key: "hydraulic", label: "Hydraulic" },
  { key: "shower", label: "Shower" },
  { key: "apd_pdi_clear_by_tpi", label: "APD / PDI Clear by TPI" },
  { key: "painting_clear_by_tpi", label: "Painting Clear by TPI" },
  { key: "lettring_clear_by_tpi", label: "Lettring Clear by TPI" },
];
const getSelectedStageKeys = (value, stages) => {
  const validKeys = new Set(stages.map((stage) => stage.key));
  return [...new Set((Array.isArray(value) ? value : []).map(asText).filter((key) => validKeys.has(key)))];
};
const getProjectStages = (project, stages, selectionField) => {
  // Older projects have no stored selection, so preserve their full stage workflow.
  if (!Array.isArray(project?.[selectionField])) return stages;
  const selectedKeys = new Set(project[selectionField]);
  return stages.filter((stage) => selectedKeys.has(stage.key));
};
const STAGE_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  SKIPPED: "skipped",
  NOT_APPLICABLE: "not_applicable",
};
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
const normalizeStageStatus = (stage = {}) => {
  const explicitStatus = asText(stage.status).toLowerCase();
  if (Object.values(STAGE_STATUS).includes(explicitStatus)) {
    return explicitStatus;
  }
  if (asText(stage.completedOn)) return STAGE_STATUS.COMPLETED;
  if (asText(stage.skippedOn)) return STAGE_STATUS.SKIPPED;
  return STAGE_STATUS.PENDING;
};
const normalizeStageRuleMap = (rules = []) =>
  new Map(
    (Array.isArray(rules) ? rules : [])
      .map((rule) => ({
        key: asText(rule?.key),
        allowSkip: Boolean(rule?.allowSkip),
        isOptional: Boolean(rule?.isOptional),
      }))
      .filter((rule) => rule.key)
      .map((rule) => [rule.key, rule])
  );
const buildStageDefinitions = (baseStages, rules = []) => {
  const ruleMap = normalizeStageRuleMap(rules);
  return baseStages.map((stage) => {
    const rule = ruleMap.get(stage.key);
    return {
      ...stage,
      allowSkip: Boolean(rule?.allowSkip),
      isOptional: Boolean(rule?.isOptional),
    };
  });
};
const isStageResolved = (stage) =>
  stage?.status === STAGE_STATUS.COMPLETED ||
  stage?.status === STAGE_STATUS.NOT_APPLICABLE ||
  (stage?.status === STAGE_STATUS.SKIPPED && stage?.isOptional);
const getStageActionDate = (stage) => asText(stage?.completedOn) || asText(stage?.skippedOn);
const normalizeStageEntry = (existingStage, stageDefinition) => {
  const status = normalizeStageStatus(existingStage);
    return {
      key: stageDefinition.key,
      label: stageDefinition.label,
      status,
      isApplicable: existingStage?.isApplicable !== false,
      allowSkip: stageDefinition.allowSkip,
      isOptional: stageDefinition.isOptional,
      completedOn: asText(existingStage?.completedOn),
      completedAt: existingStage?.completedAt || null,
      completedBy: existingStage?.completedBy || { username: "", role: "" },
      skippedOn: asText(existingStage?.skippedOn),
      skippedBy: existingStage?.skippedBy || { username: "", role: "" },
      skipReason: asText(existingStage?.skipReason),
  };
};
const getLastCompletedStage = (stages) =>
  stages
    .filter((stage) => stage.status === STAGE_STATUS.COMPLETED && stage.completedOn)
    .sort((a, b) => parseStageDate(b.completedOn)?.getTime?.() - parseStageDate(a.completedOn)?.getTime?.())[0] || null;
const findNextPendingIndex = (stages, startIndex = 0) => {
  for (let index = Math.max(0, startIndex); index < stages.length; index += 1) {
    if (!isStageResolved(stages[index])) {
      return index;
    }
  }
  return stages.length;
};
const buildProgress = ({ row, progressKey, baseStages, rules = [], activatedByDefault = true }) => {
  const sourceProgress = row?.[progressKey] || {};
  const sourceStages = Array.isArray(sourceProgress.stages) && sourceProgress.stages.length ? sourceProgress.stages : [];
  const applicableSourceStages = sourceStages.filter((stage) => stage?.isApplicable !== false);
  const sourceKeys = new Set(applicableSourceStages.map((stage) => stage.key));
  const stageDefinitions = buildStageDefinitions(
    sourceStages.length ? baseStages.filter((stage) => sourceKeys.has(stage.key)) : baseStages,
    rules
  );
  const stageMap = new Map(applicableSourceStages.map((stage) => [stage.key, stage]));
  const stages = stageDefinitions.map((stageDefinition) =>
    normalizeStageEntry(stageMap.get(stageDefinition.key), stageDefinition)
  );
  const isActivated = progressKey === "pdiProgress" ? Boolean(sourceProgress?.isActivated) : true;
  const requestedIndex = Number.isInteger(sourceProgress?.currentStageIndex)
    ? sourceProgress.currentStageIndex
    : activatedByDefault
    ? 0
    : -1;
  const currentStageIndex = !isActivated && progressKey === "pdiProgress"
    ? -1
    : findNextPendingIndex(stages, requestedIndex >= 0 ? requestedIndex : 0);
  const activeStage = currentStageIndex >= 0 && currentStageIndex < stages.length ? stages[currentStageIndex] : null;
  const unresolvedStages = stages.filter((stage) => !isStageResolved(stage));
  const skippedStages = stages.filter((stage) => stage.status === STAGE_STATUS.SKIPPED);
  const lastCompletedStage = getLastCompletedStage(stages);

  return {
    stages,
    currentStageIndex,
    lastCompletedStageKey: lastCompletedStage?.key || "",
    lastCompletedOn: lastCompletedStage?.completedOn || "",
    activeStage,
    unresolvedStages,
    skippedStages,
    isFullyCompleted: isActivated ? unresolvedStages.length === 0 : false,
    isActivated,
  };
};
const getInspectionProgress = (row, rules = []) =>
  buildProgress({
    row,
    progressKey: "inspectionProgress",
    baseStages: INSPECTION_STAGES,
    rules,
  });
const getPdiProgress = (row, rules = []) =>
  buildProgress({
    row,
    progressKey: "pdiProgress",
    baseStages: PDI_STAGES,
    rules,
    activatedByDefault: false,
  });
const getRowRuleSets = (row = {}) => ({
  inspectionRules: (row?.inspectionProgress?.stages || []).map((stage) => ({
    key: stage?.key,
    allowSkip: Boolean(stage?.allowSkip),
    isOptional: Boolean(stage?.isOptional),
  })),
  pdiRules: (row?.pdiProgress?.stages || []).map((stage) => ({
    key: stage?.key,
    allowSkip: Boolean(stage?.allowSkip),
    isOptional: Boolean(stage?.isOptional),
  })),
});
const createDefaultInspectionStages = (rules = [], selectedStageKeys = INSPECTION_STAGES.map((stage) => stage.key)) =>
  buildStageDefinitions(
    INSPECTION_STAGES.filter((stage) => selectedStageKeys.includes(stage.key)),
    rules
  ).map((stage) =>
    normalizeStageEntry({}, stage)
  );
const createDefaultPdiStages = (rules = [], selectedStageKeys = PDI_STAGES.map((stage) => stage.key)) =>
  buildStageDefinitions(
    PDI_STAGES.filter((stage) => selectedStageKeys.includes(stage.key)),
    rules
  ).map((stage) =>
    normalizeStageEntry({}, stage)
  );
const buildStageDashboardRow = (row) => {
  const { inspectionRules, pdiRules } = getRowRuleSets(row);
  const progress = getInspectionProgress(row, inspectionRules);
  const pdiProgress = getPdiProgress(row, pdiRules);
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
    const { inspectionRules } = getRowRuleSets(row);
    const progress = getInspectionProgress(row, inspectionRules);
    progress.stages.forEach((stage, index) => {
      if (stage.status === STAGE_STATUS.COMPLETED) {
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
    const { pdiRules } = getRowRuleSets(row);
    const pdiProgress = getPdiProgress(row, pdiRules);
    pdiProgress.stages.forEach((stage, index) => {
      if (stage.status === STAGE_STATUS.COMPLETED) {
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
  const { inspectionRules, pdiRules } = getRowRuleSets(row);
  const progress = pdiMode ? getPdiProgress(row, pdiRules) : getInspectionProgress(row, inspectionRules);
  const completedDates = progress.stages
    .map((stage) => parseStageDate(getStageActionDate(stage)))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  if (completedDates.length) {
    return completedDates[0];
  }
  return row?.createdAt ? new Date(row.createdAt) : null;
};
const flattenCompletionEvents = (row) => {
  const { inspectionRules, pdiRules } = getRowRuleSets(row);
  const dailyEvents = getInspectionProgress(row, inspectionRules).stages
    .filter((stage) => stage.status === STAGE_STATUS.COMPLETED && stage.completedOn && asText(stage?.completedBy?.username))
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

  const pdiEvents = getPdiProgress(row, pdiRules).stages
    .filter((stage) => stage.status === STAGE_STATUS.COMPLETED && stage.completedOn && asText(stage?.completedBy?.username))
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
          stageLabel: "DM Line Data",
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
          stageLabel: "CTRB (Wheel Data)",
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
          stageLabel: "DM Final Data",
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
const getActivityDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const buildInspectorProfile = (account, username, events = []) => ({
  username,
  name: asText(account?.name) || username,
  slNo: account?.slNo || 0,
  jobRole: asText(account?.jobRole),
  bay: asText(account?.bay),
  agency: asText(account?.agency),
  isActive: typeof account?.isActive === "boolean" ? Boolean(account.isActive) : true,
  role: asText(events[0]?.role) || "ground-inspector",
});
const buildInspectorEntries = (rows, username) =>
  rows
    .flatMap((row) => {
      const items = [];
      const projectName = asText(row?.project?.projectName) || "Independent Wheel Data";
      const baseRow = {
        rowId: String(row?._id || ""),
        projectId: row?.projectId ? String(row.projectId) : "",
        projectName,
        texNo: asText(row?.texNo) || "-",
        wheelDataKey: asText(row?.wheelDataKey) || "-",
        wagonNo: asText(row?.wagonNo) || "-",
      };

      if (row?.firstZone?.submittedBy?.username === username && row?.firstZone?.submittedAt) {
        items.push({
          id: `${baseRow.rowId}-zone-2`,
          zone: "2nd Zone",
          entryType: "Form Submission",
          submittedAt: row.firstZone.submittedAt,
          summary: "Project wagon documentation updated.",
          ...baseRow,
        });
      }
      if (row?.secondZone?.submittedBy?.username === username && row?.secondZone?.submittedAt) {
        items.push({
          id: `${baseRow.rowId}-zone-1`,
          zone: "1st Zone",
          entryType: "Form Submission",
          submittedAt: row.secondZone.submittedAt,
          summary: "Wheel, axle, and bearing entry captured.",
          ...baseRow,
        });
      }
      if (row?.finalAssembly?.submittedBy?.username === username && row?.finalAssembly?.submittedAt) {
        items.push({
          id: `${baseRow.rowId}-zone-3`,
          zone: "3rd Zone",
          entryType: "Form Submission",
          submittedAt: row.finalAssembly.submittedAt,
          summary: "Final assembly details recorded.",
          ...baseRow,
        });
      }
      return items;
    })
    .sort((a, b) => (getActivityDate(b.submittedAt)?.getTime() || 0) - (getActivityDate(a.submittedAt)?.getTime() || 0));
const buildInspectorAnalytics = ({ username, account, rows, today, todayText, weekAgo }) => {
  const completionEvents = rows
    .flatMap((row) => flattenCompletionEvents(row).map((event) => ({ ...event, row })))
    .filter((event) => event.username === username)
    .sort((a, b) => (parseStageDate(b.date)?.getTime() || 0) - (parseStageDate(a.date)?.getTime() || 0));
  const entryItems = buildInspectorEntries(rows, username);
  const activeDates = [...new Set(completionEvents.map((event) => event.date).filter(Boolean))];
  const dailyStageCompletions = completionEvents.filter((event) => event.type === "daily-stage");
  const pdiStageCompletions = completionEvents.filter((event) => event.type === "pdi-stage");
  const formSubmissions = completionEvents.filter((event) => event.type.includes("form"));
  const completedToday = completionEvents.filter((event) => event.date === todayText).length;
  const completedThisWeek = completionEvents.filter((event) => {
    const date = parseStageDate(event.date);
    return date && date >= weekAgo;
  }).length;
  const distinctProjects = [...new Set(rows.map((row) => asText(row?.project?.projectName)).filter(Boolean))];
  const distinctTexNos = [...new Set(rows.map((row) => asText(row?.texNo)).filter(Boolean))];
  const mostRecentEvent = completionEvents[0] || null;
  const stageSummaryMap = new Map();

  completionEvents.forEach((event) => {
    const key = `${event.type}:${event.stageLabel}`;
    if (!stageSummaryMap.has(key)) {
      stageSummaryMap.set(key, {
        id: key,
        stageLabel: event.stageLabel,
        type: event.type,
        category: event.type === "daily-stage" ? "Daily Stage" : event.type === "pdi-stage" ? "PDI Stage" : "Form",
        count: 0,
      });
    }
    stageSummaryMap.get(key).count += 1;
  });

  const recentActivities = completionEvents.slice(0, 20).map((event, index) => ({
    id: `${event.type}-${event.stageKey}-${event.texNo || event.projectId || index}`,
    activityType: event.type === "daily-stage" ? "Daily Stage" : event.type === "pdi-stage" ? "PDI Stage" : "Form Submission",
    stageLabel: event.stageLabel,
    date: event.date,
    texNo: asText(event.texNo) || "-",
    projectName: asText(event.row?.project?.projectName) || "Independent Wheel Data",
    wheelDataKey: asText(event.row?.wheelDataKey) || "-",
  }));

  const formCounts = {
    zone1: formSubmissions.filter((event) => event.type === "zone-1-form").length,
    zone2: formSubmissions.filter((event) => event.type === "zone-2-form").length,
    zone3: formSubmissions.filter((event) => event.type === "zone-3-form").length,
  };

  return {
    profile: buildInspectorProfile(account, username, completionEvents),
    summary: {
      totalActivities: completionEvents.length,
      dailyStageCompletions: dailyStageCompletions.length,
      pdiStageCompletions: pdiStageCompletions.length,
      formSubmissions: formSubmissions.length,
      completedToday,
      completedThisWeek,
      activeDays: activeDates.length,
      averageActivitiesPerActiveDay: activeDates.length
        ? Number((completionEvents.length / activeDates.length).toFixed(1))
        : 0,
      totalProjectsWorked: distinctProjects.length,
      totalTexNosHandled: distinctTexNos.length,
      independentWheelEntries: rows.filter((row) => !row.projectId && row?.secondZone?.submittedBy?.username === username).length,
      lastActivityDate: mostRecentEvent?.date || "",
      lastActivityLabel: mostRecentEvent?.stageLabel || "",
      mostFrequentActivity:
        [...stageSummaryMap.values()].sort((a, b) => b.count - a.count)[0]?.stageLabel || "",
    },
    formCounts,
    stageBreakdown: [...stageSummaryMap.values()].sort((a, b) => b.count - a.count),
    recentActivities,
    recentEntries: entryItems.slice(0, 20),
    projectSpread: distinctProjects.slice(0, 20).map((projectName) => ({
      projectName,
      activityCount: completionEvents.filter((event) => asText(event.row?.project?.projectName) === projectName).length,
    })),
  };
};
const hasCompletedStage = (row, stageKey) =>
  getInspectionProgress(row, getRowRuleSets(row).inspectionRules).stages.some(
    (stage) => stage.key === stageKey && stage.status === STAGE_STATUS.COMPLETED
  );
const isPdiActivated = (row) => getPdiProgress(row, getRowRuleSets(row).pdiRules).isActivated;
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
const asSerialNumbers = (value, fieldLabel = "Serial numbers", allowDuplicates = false) => {
  const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n|,/);
  const serialNumbers = source
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!allowDuplicates) {
    const duplicateSerialNumber = findDuplicateSerialNumber(serialNumbers);
    if (duplicateSerialNumber) {
      throw new Error(`${fieldLabel} must be unique within the same field. Duplicate serial number: ${duplicateSerialNumber}`);
    }
  }

  return serialNumbers;
};
const asAlignedOptionalValues = (value, expectedLength, limit = 8) => {
  const targetLength = Math.max(0, Math.min(Number(expectedLength) || 0, limit));
  const source = Array.isArray(value) ? value : [];
  const normalized = source.slice(0, targetLength).map((item) => String(item || "").trim());

  while (normalized.length < targetLength) {
    normalized.push("");
  }

  return normalized;
};
const asUniqueSerialHeatNumbers = (value, serialValue, fieldLabel) => {
  const serialSlots = Array.isArray(serialValue) ? serialValue : String(serialValue || "").split(/\r?\n|,/);
  const heatNumbers = [];
  const seen = new Set();
  for (const [index, serialValue] of serialSlots.entries()) {
    const serialNumber = String(serialValue || "").trim();
    if (!serialNumber) continue;
    const heatNumber = String((Array.isArray(value) ? value[index] : "") || "").trim();
    const pair = JSON.stringify([normalizeSerialNumber(serialNumber), normalizeSerialNumber(heatNumber)]);
    if (seen.has(pair)) {
      throw new Error(`${fieldLabel} serial/heat combinations must be unique. Duplicate serial number: ${serialNumber}, heat number: ${heatNumber || "(blank)"}`);
    }
    seen.add(pair);
    heatNumbers.push(heatNumber);
    if (heatNumbers.length === 8) break;
  }
  return heatNumbers;
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
const getProjectWagonType = (project = {}) =>
  asText(project?.wagonTypeOffered) || asText(project?.wagonTypeInPo);
const findWagonConfigByType = async (wagonType) => {
  const safeType = asText(wagonType);
  if (!safeType) return null;
  return WagonConfig.findOne({ wagonType: buildExactMatchRegex(safeType) }).lean();
};
const buildRuleSetsFromConfig = (config = {}) => ({
  inspectionRules: Array.isArray(config?.inspectionStageRules) ? config.inspectionStageRules : [],
  pdiRules: Array.isArray(config?.pdiStageRules) ? config.pdiStageRules : [],
});
const hydrateStageRules = (row = {}, ruleSets = {}) => {
  const applyRules = (stages = [], rules = []) => {
    if (!Array.isArray(stages) || !stages.length) return stages;
    const ruleMap = normalizeStageRuleMap(rules);
    return stages.map((stage) => {
      const rule = ruleMap.get(asText(stage?.key));
      return {
        ...stage,
        allowSkip: Object.prototype.hasOwnProperty.call(stage || {}, "allowSkip")
          ? Boolean(stage.allowSkip)
          : Boolean(rule?.allowSkip),
        isOptional: Object.prototype.hasOwnProperty.call(stage || {}, "isOptional")
          ? Boolean(stage.isOptional)
          : Boolean(rule?.isOptional),
      };
    });
  };

  return {
    ...row,
    inspectionProgress: row?.inspectionProgress
      ? {
          ...row.inspectionProgress,
          stages: applyRules(row.inspectionProgress.stages, ruleSets.inspectionRules),
        }
      : row?.inspectionProgress,
    pdiProgress: row?.pdiProgress
      ? {
          ...row.pdiProgress,
          stages: applyRules(row.pdiProgress.stages, ruleSets.pdiRules),
        }
      : row?.pdiProgress,
  };
};
const syncProgressPayload = (progress, isPdi = false) => ({
  stages: progress.stages.map((stage) => ({
    key: stage.key,
    label: stage.label,
    status: stage.status,
    isApplicable: stage.isApplicable !== false,
    allowSkip: Boolean(stage.allowSkip),
    isOptional: Boolean(stage.isOptional),
    completedOn: stage.completedOn || "",
    completedAt: stage.completedAt || null,
    completedBy: stage.completedBy || { username: "", role: "" },
    skippedOn: stage.skippedOn || "",
    skippedBy: stage.skippedBy || { username: "", role: "" },
    skipReason: stage.skipReason || "",
  })),
  currentStageIndex: progress.currentStageIndex,
  lastCompletedStageKey: progress.lastCompletedStageKey || "",
  lastCompletedOn: progress.lastCompletedOn || "",
  ...(isPdi ? { isActivated: progress.isActivated } : {}),
});
const getStageByKey = (progress, stageKey) =>
  (progress?.stages || []).find((stage) => stage.key === stageKey) || null;
const canStageBeCompleted = (stage, activeStage) =>
  Boolean(stage) &&
  (stage.status === STAGE_STATUS.SKIPPED || activeStage?.key === stage.key);
const canTemporarilySkipStage = (stage) =>
  Boolean(stage) && stage.key !== "uf_fit_up";
const resetStageEntry = (stage) => ({
  ...stage,
  status: STAGE_STATUS.PENDING,
  completedOn: "",
  completedAt: null,
  completedBy: { username: "", role: "" },
  skippedOn: "",
  skippedBy: { username: "", role: "" },
  skipReason: "",
});

const getNextSlNo = async (projectId) => {
  const existingRows = await WagonDataSheetRow.find({ projectId }).select("slNo").lean();
  const maxSlNo = existingRows.reduce((maxValue, row) => {
    const numericValue = Number.parseInt(String(row?.slNo || ""), 10);
    return Number.isFinite(numericValue) ? Math.max(maxValue, numericValue) : maxValue;
  }, 0);

  return String(maxSlNo + 1);
};
const ensureUniqueWagonIdentifiers = async ({ rowId, projectId, texNo, wagonNo }) => {
  const duplicateChecks = [];
  const cleanTexNo = asText(texNo);
  const cleanWagonNo = asText(wagonNo);

  if (cleanTexNo) {
    duplicateChecks.push({ projectId, texNo: buildExactMatchRegex(cleanTexNo) });
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
    .select("projectId texNo wagonNo")
    .lean();

  if (cleanTexNo && duplicateRows.some((row) => String(row.projectId) === String(projectId) && asText(row.texNo).toUpperCase() === cleanTexNo.toUpperCase())) {
    throw new Error("TEX No. already filled in this project.");
  }
  if (cleanWagonNo && duplicateRows.some((row) => asText(row.wagonNo).toUpperCase() === cleanWagonNo.toUpperCase())) {
    throw new Error("Wagon No. already filled.");
  }
};

router.get("/projects", async (_req, res) => {
  try {
    const projects = await WagonDataSheetProject.find().sort({ createdAt: -1 }).lean();
    const ids = projects.map((project) => project._id);
    const [projectRows, wagonConfigs] = await Promise.all([
      ids.length ? WagonDataSheetRow.find({ projectId: { $in: ids } }).lean() : [],
      WagonConfig.find().lean(),
    ]);
    const configMap = new Map(
      wagonConfigs.map((config) => [asText(config?.wagonType).toUpperCase(), buildRuleSetsFromConfig(config)])
    );
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
        const ruleSets = configMap.get(getProjectWagonType(project).toUpperCase()) || {};
        const rows = (rowMap.get(String(project._id)) || []).map((row) => hydrateStageRules(row, ruleSets));
        const stageCounts = buildStageCounts(rows);
        const pdiCounts = buildPdiCounts(rows);
        const completedRows = rows.filter((row) => getInspectionProgress(row, getRowRuleSets(row).inspectionRules).isFullyCompleted).length;
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
    const applicableDailyStageKeys = Object.prototype.hasOwnProperty.call(req.body, "applicableDailyStageKeys")
      ? getSelectedStageKeys(req.body.applicableDailyStageKeys, INSPECTION_STAGES)
      : INSPECTION_STAGES.map((stage) => stage.key);
    const applicablePdiStageKeys = Object.prototype.hasOwnProperty.call(req.body, "applicablePdiStageKeys")
      ? getSelectedStageKeys(req.body.applicablePdiStageKeys, PDI_STAGES)
      : PDI_STAGES.map((stage) => stage.key);
    if (!applicableDailyStageKeys.length || !applicablePdiStageKeys.length) {
      return res.status(400).json({ success: false, message: "Select at least one applicable Daily and PDI stage." });
    }

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
      applicableDailyStageKeys,
      applicablePdiStageKeys,
      notes: asText(req.body.notes),
    };

    const project = await WagonDataSheetProject.create(payload);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error("Error creating wagon data sheet project:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/projects/:projectId", authMiddleware, async (req, res) => {
  try {
    if (!["admin", "quality-admin"].includes(asText(req.user?.role))) {
      return res.status(403).json({ success: false, message: "Only Quality Admin or Master Admin can update project details." });
    }

    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const existingProject = await WagonDataSheetProject.findById(projectId).lean();
    if (!existingProject) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }
    const applicableDailyStageKeys = Object.prototype.hasOwnProperty.call(req.body, "applicableDailyStageKeys")
      ? getSelectedStageKeys(req.body.applicableDailyStageKeys, INSPECTION_STAGES)
      : (existingProject.applicableDailyStageKeys?.length ? existingProject.applicableDailyStageKeys : INSPECTION_STAGES.map((stage) => stage.key));
    const applicablePdiStageKeys = Object.prototype.hasOwnProperty.call(req.body, "applicablePdiStageKeys")
      ? getSelectedStageKeys(req.body.applicablePdiStageKeys, PDI_STAGES)
      : (existingProject.applicablePdiStageKeys?.length ? existingProject.applicablePdiStageKeys : PDI_STAGES.map((stage) => stage.key));
    if (!applicableDailyStageKeys.length || !applicablePdiStageKeys.length) {
      return res.status(400).json({ success: false, message: "Select at least one applicable Daily and PDI stage." });
    }

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
      applicableDailyStageKeys,
      applicablePdiStageKeys,
      notes: asText(req.body.notes),
    };

    const project = await WagonDataSheetProject.findByIdAndUpdate(projectId, payload, {
      new: true,
      runValidators: true,
    });

    const dailyKeys = new Set(applicableDailyStageKeys);
    const pdiKeys = new Set(applicablePdiStageKeys);
    const projectRows = await WagonDataSheetRow.find({ projectId }).lean();
    if (projectRows.length) {
      await WagonDataSheetRow.bulkWrite(projectRows.map((row) => ({
        updateOne: {
          filter: { _id: row._id },
          update: {
            $set: {
              "inspectionProgress.stages": (row.inspectionProgress?.stages || []).map((stage) => ({
                ...stage,
                isApplicable: dailyKeys.has(stage.key),
              })),
              "inspectionProgress.currentStageIndex": 0,
              "pdiProgress.stages": (row.pdiProgress?.stages || []).map((stage) => ({
                ...stage,
                isApplicable: pdiKeys.has(stage.key),
              })),
              "pdiProgress.currentStageIndex": 0,
            },
          },
        },
      })));
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error("Error updating wagon data sheet project:", error);
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

    const wagonConfig = await findWagonConfigByType(getProjectWagonType(project));
    const ruleSets = buildRuleSetsFromConfig(wagonConfig);
    const rows = (await attachLinkedWheelDataRows(rawRows))
      .map((row) => hydrateStageRules(row, ruleSets))
      .map(buildStageDashboardRow);
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

    const wagonConfig = await findWagonConfigByType(getProjectWagonType(project));
    const ruleSets = buildRuleSetsFromConfig(wagonConfig);
    const dailyStages = getProjectStages(project, INSPECTION_STAGES, "applicableDailyStageKeys");
    const pdiStages = getProjectStages(project, PDI_STAGES, "applicablePdiStageKeys");
    const hydratedRows = rows.map((row) => hydrateStageRules(row, ruleSets));
    const dashboardRows = hydratedRows.map(buildStageDashboardRow);
    res.json({
      success: true,
      data: {
        project,
        stages: dailyStages,
        pdiStages,
        stageCounts: buildStageCounts(hydratedRows),
        pdiStageCounts: buildPdiCounts(hydratedRows),
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
    const [projects, rows, wagonConfigs, totalZone1FormsComplete] = await Promise.all([
      WagonDataSheetProject.find().sort({ createdAt: -1 }).lean(),
      WagonDataSheetRow.find({ projectId: { $ne: null } }).sort({ createdAt: 1 }).lean(),
      WagonConfig.find().lean(),
      WagonDataSheetRow.countDocuments({ "secondZone.submittedAt": { $ne: null } }),
    ]);

    const projectMap = new Map(projects.map((project) => [String(project._id), project]));
    const configMap = new Map(
      wagonConfigs.map((config) => [asText(config?.wagonType).toUpperCase(), buildRuleSetsFromConfig(config)])
    );
    const today = new Date();
    const todayText = formatStageDate(today);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const rowsWithProgress = rows.map((row) => {
      const project = projectMap.get(String(row.projectId || "")) || null;
      const hydratedRow = hydrateStageRules(
        row,
        configMap.get(getProjectWagonType(project).toUpperCase()) || {}
      );
      const inspection = getInspectionProgress(hydratedRow, getRowRuleSets(hydratedRow).inspectionRules);
      const pdi = getPdiProgress(hydratedRow, getRowRuleSets(hydratedRow).pdiRules);
      const currentStageAgeDays = inspection.activeStage ? diffInDays(getStageReferenceDate(hydratedRow, false), today) : null;
      const currentPdiAgeDays = pdi.activeStage ? diffInDays(getStageReferenceDate(hydratedRow, true), today) : null;
      return {
        ...hydratedRow,
        project,
        inspection,
        pdi,
        currentStageAgeDays,
        currentPdiAgeDays,
      };
    });

    const stageCounts = buildStageCounts(rowsWithProgress);
    const pdiStageCounts = buildPdiCounts(rowsWithProgress);
    const completionEvents = rowsWithProgress.flatMap(flattenCompletionEvents);

    const overall = {
      totalProjects: projects.length,
      totalTexNos: rowsWithProgress.filter((row) => asText(row.texNo)).length,
      totalWagonInspections: rowsWithProgress.length,
      dailyInProgress: rowsWithProgress.filter((row) => row.inspection.activeStage).length,
      pdiInProgress: rowsWithProgress.filter((row) => row.pdi.activeStage).length,
      fullyCompletedWagons: rowsWithProgress.filter((row) => row.inspection.isFullyCompleted).length,
      completionPercent: rowsWithProgress.length
        ? Number(((rowsWithProgress.filter((row) => row.inspection.isFullyCompleted).length / rowsWithProgress.length) * 100).toFixed(1))
        : 0,
      reachedDmLine: rowsWithProgress.filter((row) => row.pdi.isActivated).length,
      waitingInPdi: rowsWithProgress.filter((row) => row.pdi.isActivated && row.pdi.activeStage).length,
      finalPdiCleared: rowsWithProgress.filter((row) => row.pdi.isFullyCompleted).length,
      totalZone1FormsComplete,
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
      const completed = projectRows.filter((row) => row.inspection.isFullyCompleted).length;
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

    const pendingRows = rowsWithProgress.filter(
      (row) => !row.inspection.isFullyCompleted || (row.pdi.isActivated && !row.pdi.isFullyCompleted)
    );
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
    const texProjectKey = (row) => JSON.stringify([String(row.projectId || ""), asText(row.texNo).toUpperCase()]);
    rowsWithProgress.forEach((row) => {
      const texNo = asText(row.texNo);
      if (!texNo) return;
      const key = texProjectKey(row);
      texFrequency.set(key, (texFrequency.get(key) || 0) + 1);
    });

    const buildExceptionRow = (row) => ({
      rowId: String(row._id),
      projectId: String(row.projectId || ""),
      projectName: asText(row.project?.projectName) || "Untitled Project",
      slNo: asText(row.slNo) || "-",
      texNo: asText(row.texNo) || "Not assigned",
      wagonNo: asText(row.wagonNo) || "Not entered",
      dailyStage: asText(row.inspection?.activeStage?.label) || "No active daily stage",
      pdiStage: asText(row.pdi?.activeStage?.label) || (row.pdi?.isFullyCompleted ? "PDI complete" : "Not active"),
    });
    const exceptionRows = {
      rowsWithoutTexNo: rowsWithProgress.filter((row) => !asText(row.texNo)).map(buildExceptionRow),
      zone2PendingThoughEligible: rowsWithProgress
        .filter((row) => row.pdi.isActivated && !row.firstZone?.submittedAt)
        .map(buildExceptionRow),
      rowsStuckWithoutActiveStage: rowsWithProgress
        .filter((row) => !row.inspection.activeStage && !row.pdi.isFullyCompleted)
        .map(buildExceptionRow),
      rowsReachedPdiButNotActivated: rowsWithProgress
        .filter((row) => row.inspection.activeStage?.key === "dm_line" && !row.pdi.isActivated)
        .map(buildExceptionRow),
      incompleteRequiredForms: rowsWithProgress
        .filter((row) => row.firstZone?.submittedAt && (!asText(row.wagonConfiguration) || !asText(row.wagonNo)))
        .map(buildExceptionRow),
      duplicateTexNos: rowsWithProgress
        .filter((row) => asText(row.texNo) && (texFrequency.get(texProjectKey(row)) || 0) > 1)
        .map(buildExceptionRow),
    };

    const dataQuality = {
      rowsWithoutTexNo: rowsWithProgress.filter((row) => !asText(row.texNo)).length,
      duplicateTexNos: [...texFrequency.entries()]
        .filter(([, count]) => count > 1)
        .map(([key, count]) => {
          const [projectId, texNo] = JSON.parse(key);
          return { projectId, texNo, count };
        }),
      rowsStuckWithoutActiveStage: rowsWithProgress.filter((row) => !row.inspection.activeStage && !row.pdi.isFullyCompleted).length,
      rowsReachedPdiButNotActivated: rowsWithProgress.filter((row) => row.inspection.activeStage?.key === "dm_line" && !row.pdi.isActivated).length,
      zone2PendingThoughEligible: rowsWithProgress.filter((row) => row.pdi.isActivated && !row.firstZone?.submittedAt).length,
      incompleteRequiredForms: rowsWithProgress.filter((row) => row.firstZone?.submittedAt && (!asText(row.wagonConfiguration) || !asText(row.wagonNo))).length,
      exceptionRows,
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

router.get("/analytics/inspectors/:username", async (req, res) => {
  try {
    const username = asText(req.params.username);
    if (!username) {
      return res.status(400).json({ success: false, message: "Inspector username is required." });
    }

    const [account, rows, projects, wagonConfigs] = await Promise.all([
      InspectorAccount.findOne({ username }).lean(),
      WagonDataSheetRow.find({
        $or: [
          { "inspectionProgress.stages.completedBy.username": username },
          { "pdiProgress.stages.completedBy.username": username },
          { "firstZone.submittedBy.username": username },
          { "secondZone.submittedBy.username": username },
          { "finalAssembly.submittedBy.username": username },
        ],
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean(),
      WagonDataSheetProject.find().lean(),
      WagonConfig.find().lean(),
    ]);

    if (!account && rows.length === 0) {
      return res.status(404).json({ success: false, message: "Inspector activity was not found." });
    }

    const projectMap = new Map(projects.map((project) => [String(project._id), project]));
    const configMap = new Map(
      wagonConfigs.map((config) => [asText(config?.wagonType).toUpperCase(), buildRuleSetsFromConfig(config)])
    );
    const today = new Date();
    const todayText = formatStageDate(today);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const rowsWithProgress = rows.map((row) => {
      const project = projectMap.get(String(row.projectId || "")) || null;
      const hydratedRow = hydrateStageRules(
        row,
        configMap.get(getProjectWagonType(project).toUpperCase()) || {}
      );
      return {
        ...hydratedRow,
        project,
        inspection: getInspectionProgress(hydratedRow, getRowRuleSets(hydratedRow).inspectionRules),
        pdi: getPdiProgress(hydratedRow, getRowRuleSets(hydratedRow).pdiRules),
      };
    });

    res.json({
      success: true,
      data: buildInspectorAnalytics({
        username,
        account,
        rows: rowsWithProgress,
        today,
        todayText,
        weekAgo,
      }),
    });
  } catch (error) {
    console.error("Error fetching inspector analytics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/analytics/zone1-forms", async (_req, res) => {
  try {
    const rows = await WagonDataSheetRow.find({
      "secondZone.submittedAt": { $ne: null },
    })
      .sort({ "secondZone.submittedAt": -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: rows.map((row) => ({
        rowId: String(row._id),
        projectId: row.projectId ? String(row.projectId) : "",
        wheelDataKey: asText(row.wheelDataKey),
        wheelDia: asText(row?.secondZone?.wheelDia),
        wheelOrigin: asText(row?.secondZone?.wheelOrigin),
        axleMake: asText(row?.secondZone?.axle?.make),
        axleSerialNumbers: Array.isArray(row?.secondZone?.axle?.serialNumbers) ? row.secondZone.axle.serialNumbers : [],
        axleHeatNumbers: Array.isArray(row?.secondZone?.axleHeatNumbers) ? row.secondZone.axleHeatNumbers : [],
        wheelMake: asText(row?.secondZone?.wheel?.make),
        wheelSerialNumbers: Array.isArray(row?.secondZone?.wheel?.serialNumbers) ? row.secondZone.wheel.serialNumbers : [],
        wheelHeatNumbers: Array.isArray(row?.secondZone?.wheelHeatNumbers) ? row.secondZone.wheelHeatNumbers : [],
        bearingMake: asText(row?.secondZone?.bearing?.make),
        bearingSerialNumbers: Array.isArray(row?.secondZone?.bearing?.serialNumbers) ? row.secondZone.bearing.serialNumbers : [],
        inspectorName: asText(row?.secondZone?.submittedBy?.username),
        inspectorRole: asText(row?.secondZone?.submittedBy?.role),
        submittedAt: row?.secondZone?.submittedAt || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching CTRB wheel data analytics rows:", error);
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

    const project = await WagonDataSheetProject.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }
    const wagonConfig = await findWagonConfigByType(getProjectWagonType(project));
    const { inspectionRules, pdiRules } = buildRuleSetsFromConfig(wagonConfig);
    const dailyStageKeys = getProjectStages(project, INSPECTION_STAGES, "applicableDailyStageKeys").map((stage) => stage.key);
    const pdiStageKeys = getProjectStages(project, PDI_STAGES, "applicablePdiStageKeys").map((stage) => stage.key);

    const row = await WagonDataSheetRow.create({
      projectId,
      slNo: await getNextSlNo(projectId),
      texNo: "",
      wheelDataKey: createInternalWheelDataKey("STAGE"),
      inspectionProgress: {
        stages: createDefaultInspectionStages(inspectionRules, dailyStageKeys),
        currentStageIndex: 0,
        lastCompletedStageKey: "",
        lastCompletedOn: "",
      },
      pdiProgress: {
        stages: createDefaultPdiStages(pdiRules, pdiStageKeys),
        currentStageIndex: -1,
        lastCompletedStageKey: "",
        lastCompletedOn: "",
        isActivated: false,
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

    const progress = getInspectionProgress(row.toObject(), getRowRuleSets(row.toObject()).inspectionRules);
    const targetStage = getStageByKey(progress, stageKey);
    const expectedStage = progress.activeStage;

    if (!targetStage) {
      return res.status(400).json({ success: false, message: "Selected stage was not found." });
    }
    if (!expectedStage && targetStage.status !== STAGE_STATUS.SKIPPED) {
      return res.status(400).json({ success: false, message: "All active stages are already resolved. Complete a skipped stage instead." });
    }
    if (!canStageBeCompleted(targetStage, expectedStage)) {
      return res.status(400).json({
        success: false,
        message: targetStage.status === STAGE_STATUS.PENDING
          ? `Only the current pending stage can be completed. Pending stage: ${expectedStage?.label || "None"}.`
          : "Only skipped or current pending stages can be completed.",
      });
    }

    if (stageKey === "uf_fit_up") {
      const texNo = assertValidTexNo(req.body.texNo, true);

      await ensureUniqueWagonIdentifiers({
        rowId: row._id,
        projectId: row.projectId,
        texNo,
        wagonNo: row.wagonNo,
      });
      row.texNo = texNo;
    }

    const completedOn = asText(req.body.completedOn) || formatStageDate();
    const completedAt = new Date();
    const stages = progress.stages.map((stage) =>
      stage.key === stageKey
        ? {
            ...stage,
            status: STAGE_STATUS.COMPLETED,
            completedOn,
            completedAt,
            completedBy: asSubmittedBy(req.body),
            skippedOn: "",
            skippedBy: { username: "", role: "" },
            skipReason: "",
          }
        : stage
    );
    const nextProgress = getInspectionProgress(
      {
        ...row.toObject(),
        inspectionProgress: {
          ...row.inspectionProgress?.toObject?.(),
          stages,
          currentStageIndex: expectedStage?.key === stageKey
            ? Math.min(progress.currentStageIndex + 1, INSPECTION_STAGES.length)
            : progress.currentStageIndex,
        },
      },
      getRowRuleSets(row.toObject()).inspectionRules
    );

    row.inspectionProgress = syncProgressPayload(nextProgress);

    if (nextProgress.activeStage?.key === "dm_line" || nextProgress.isFullyCompleted) {
      const currentPdi = getPdiProgress(row.toObject(), getRowRuleSets(row.toObject()).pdiRules);
      const activatedPdi = getPdiProgress(
        {
          ...row.toObject(),
          pdiProgress: {
            ...row.pdiProgress?.toObject?.(),
            stages: currentPdi.stages.length ? currentPdi.stages : createDefaultPdiStages(),
            currentStageIndex: currentPdi.isActivated ? currentPdi.currentStageIndex : 0,
            lastCompletedStageKey: currentPdi.lastCompletedStageKey || "",
            lastCompletedOn: currentPdi.lastCompletedOn || "",
            isActivated: true,
          },
        },
        getRowRuleSets(row.toObject()).pdiRules
      );
      row.pdiProgress = syncProgressPayload(activatedPdi, true);
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

    const dailyRules = getRowRuleSets(row.toObject()).inspectionRules;
    const pdiRules = getRowRuleSets(row.toObject()).pdiRules;
    const dailyProgress = getInspectionProgress(row.toObject(), dailyRules);
    const pdiProgress = getPdiProgress(row.toObject(), pdiRules);
    const targetStage = getStageByKey(pdiProgress, stageKey);

    if (!pdiProgress.isActivated) {
      return res.status(400).json({ success: false, message: "PDI stages are not activated yet for this TEX No." });
    }
    if (!targetStage) {
      return res.status(400).json({ success: false, message: "Selected PDI stage was not found." });
    }
    if (!pdiProgress.activeStage && targetStage.status !== STAGE_STATUS.SKIPPED) {
      return res.status(400).json({ success: false, message: "All active PDI stages are resolved. Complete a skipped PDI stage instead." });
    }
    if (!canStageBeCompleted(targetStage, pdiProgress.activeStage)) {
      return res.status(400).json({
        success: false,
        message: targetStage.status === STAGE_STATUS.PENDING
          ? `Only the current PDI stage can be completed. Pending PDI stage: ${pdiProgress.activeStage?.label || "None"}.`
          : "Only skipped or current pending PDI stages can be completed.",
      });
    }

    const completedOn = asText(req.body.completedOn) || formatStageDate();
    const completedAt = new Date();
    const stages = pdiProgress.stages.map((stage) =>
      stage.key === stageKey
        ? {
            ...stage,
            status: STAGE_STATUS.COMPLETED,
            completedOn,
            completedAt,
            completedBy: asSubmittedBy(req.body),
            skippedOn: "",
            skippedBy: { username: "", role: "" },
            skipReason: "",
          }
        : stage
    );
    const nextPdiProgress = getPdiProgress(
      {
        ...row.toObject(),
        pdiProgress: {
          ...row.pdiProgress?.toObject?.(),
          stages,
          currentStageIndex: pdiProgress.activeStage?.key === stageKey
            ? Math.min(pdiProgress.currentStageIndex + 1, PDI_STAGES.length)
            : pdiProgress.currentStageIndex,
          isActivated: true,
        },
      },
      pdiRules
    );

    row.pdiProgress = syncProgressPayload(nextPdiProgress, true);

    if (nextPdiProgress.isFullyCompleted) {
      const dailyStages = dailyProgress.stages.map((stage) =>
        stage.key === "dm_line" && stage.status !== STAGE_STATUS.COMPLETED
          ? {
              ...stage,
              status: STAGE_STATUS.COMPLETED,
              completedOn,
              completedAt,
              completedBy: asSubmittedBy(req.body),
              skippedOn: "",
              skippedBy: { username: "", role: "" },
              skipReason: "",
            }
          : stage
      );
      const syncedDaily = getInspectionProgress(
        {
          ...row.toObject(),
          inspectionProgress: {
            ...row.inspectionProgress?.toObject?.(),
            stages: dailyStages,
            currentStageIndex: Math.max(dailyProgress.currentStageIndex, INSPECTION_STAGES.length),
          },
        },
        dailyRules
      );
      row.inspectionProgress = syncProgressPayload(syncedDaily);
    }

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error completing wagon PDI stage:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/rows/:rowId/stages/:stageKey/skip", async (req, res) => {
  try {
    const { rowId, stageKey } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findById(rowId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    const inspectionRules = getRowRuleSets(row.toObject()).inspectionRules;
    const progress = getInspectionProgress(row.toObject(), inspectionRules);
    const activeStage = progress.activeStage;

    if (!activeStage) {
      return res.status(400).json({ success: false, message: "There is no active daily stage to skip." });
    }
    if (activeStage.key !== stageKey) {
      return res.status(400).json({
        success: false,
        message: `Only the current pending stage can be skipped. Pending stage: ${activeStage.label}.`,
      });
    }
    if (!canTemporarilySkipStage(activeStage)) {
      return res.status(400).json({ success: false, message: `${activeStage.label} cannot be skipped.` });
    }

    const skippedOn = asText(req.body.skippedOn) || formatStageDate();
    const stages = progress.stages.map((stage) =>
      stage.key === stageKey
        ? {
            ...stage,
            status: STAGE_STATUS.SKIPPED,
            skippedOn,
            completedAt: null,
            skippedBy: asSubmittedBy(req.body),
            skipReason: asText(req.body.skipReason) || "Skipped for later completion",
            completedOn: "",
            completedBy: { username: "", role: "" },
          }
        : stage
    );
    const nextProgress = getInspectionProgress(
      {
        ...row.toObject(),
        inspectionProgress: {
          ...row.inspectionProgress?.toObject?.(),
          stages,
          currentStageIndex: Math.min(progress.currentStageIndex + 1, INSPECTION_STAGES.length),
        },
      },
      inspectionRules
    );
    row.inspectionProgress = syncProgressPayload(nextProgress);

    if (nextProgress.activeStage?.key === "dm_line" || nextProgress.isFullyCompleted) {
      const pdiRules = getRowRuleSets(row.toObject()).pdiRules;
      const currentPdi = getPdiProgress(row.toObject(), pdiRules);
      const activatedPdi = getPdiProgress(
        {
          ...row.toObject(),
          pdiProgress: {
            ...row.pdiProgress?.toObject?.(),
            stages: currentPdi.stages.length ? currentPdi.stages : createDefaultPdiStages(),
            currentStageIndex: currentPdi.isActivated ? currentPdi.currentStageIndex : 0,
            lastCompletedStageKey: currentPdi.lastCompletedStageKey || "",
            lastCompletedOn: currentPdi.lastCompletedOn || "",
            isActivated: true,
          },
        },
        pdiRules
      );
      row.pdiProgress = syncProgressPayload(activatedPdi, true);
    }

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error skipping wagon stage:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/rows/:rowId/pdi-stages/:stageKey/skip", async (req, res) => {
  try {
    const { rowId, stageKey } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findById(rowId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    const pdiRules = getRowRuleSets(row.toObject()).pdiRules;
    const progress = getPdiProgress(row.toObject(), pdiRules);
    const activeStage = progress.activeStage;

    if (!progress.isActivated) {
      return res.status(400).json({ success: false, message: "PDI stages are not activated yet for this TEX No." });
    }
    if (!activeStage) {
      return res.status(400).json({ success: false, message: "There is no active PDI stage to skip." });
    }
    if (activeStage.key !== stageKey) {
      return res.status(400).json({
        success: false,
        message: `Only the current pending PDI stage can be skipped. Pending PDI stage: ${activeStage.label}.`,
      });
    }
    if (!canTemporarilySkipStage(activeStage)) {
      return res.status(400).json({ success: false, message: `${activeStage.label} cannot be skipped.` });
    }

    const skippedOn = asText(req.body.skippedOn) || formatStageDate();
    const stages = progress.stages.map((stage) =>
      stage.key === stageKey
        ? {
            ...stage,
            status: STAGE_STATUS.SKIPPED,
            skippedOn,
            completedAt: null,
            skippedBy: asSubmittedBy(req.body),
            skipReason: asText(req.body.skipReason) || "Skipped for later completion",
            completedOn: "",
            completedBy: { username: "", role: "" },
          }
        : stage
    );
    const nextProgress = getPdiProgress(
      {
        ...row.toObject(),
        pdiProgress: {
          ...row.pdiProgress?.toObject?.(),
          stages,
          currentStageIndex: Math.min(progress.currentStageIndex + 1, PDI_STAGES.length),
          isActivated: true,
        },
      },
      pdiRules
    );
    row.pdiProgress = syncProgressPayload(nextProgress, true);

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error skipping wagon PDI stage:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/rows/:rowId/stages/:stageKey/reset", async (req, res) => {
  try {
    const { rowId, stageKey } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findById(rowId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    const rowObject = row.toObject();
    const { inspectionRules, pdiRules } = getRowRuleSets(rowObject);
    const dailyProgress = getInspectionProgress(rowObject, inspectionRules);
    const targetIndex = dailyProgress.stages.findIndex((stage) => stage.key === stageKey);
    const targetStage = getStageByKey(dailyProgress, stageKey);

    if (targetIndex < 0 || !targetStage) {
      return res.status(404).json({ success: false, message: "Daily stage not found." });
    }
    if (targetStage.status !== STAGE_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: "Only completed daily stages can be reset." });
    }

    const nextDailyStages = dailyProgress.stages.map((stage) =>
      stage.key === stageKey ? resetStageEntry(stage) : stage
    );
    const nextDailyProgress = getInspectionProgress(
      {
        ...rowObject,
        inspectionProgress: {
          ...row.inspectionProgress?.toObject?.(),
          stages: nextDailyStages,
          currentStageIndex: targetIndex,
        },
      },
      inspectionRules
    );
    row.inspectionProgress = syncProgressPayload(nextDailyProgress);

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error resetting wagon daily stage:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/rows/:rowId/pdi-stages/:stageKey/reset", async (req, res) => {
  try {
    const { rowId, stageKey } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findById(rowId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    const rowObject = row.toObject();
    const { inspectionRules, pdiRules } = getRowRuleSets(rowObject);
    const pdiProgress = getPdiProgress(rowObject, pdiRules);
    const targetIndex = pdiProgress.stages.findIndex((stage) => stage.key === stageKey);
    const targetStage = getStageByKey(pdiProgress, stageKey);

    if (targetIndex < 0 || !targetStage) {
      return res.status(404).json({ success: false, message: "PDI stage not found." });
    }
    if (targetStage.status !== STAGE_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: "Only completed PDI stages can be reset." });
    }

    const nextPdiStages = pdiProgress.stages.map((stage) =>
      stage.key === stageKey ? resetStageEntry(stage) : stage
    );
    const nextPdiProgress = getPdiProgress(
      {
        ...rowObject,
        pdiProgress: {
          ...row.pdiProgress?.toObject?.(),
          stages: nextPdiStages,
          currentStageIndex: targetIndex,
          isActivated: true,
        },
      },
      pdiRules
    );
    row.pdiProgress = syncProgressPayload(nextPdiProgress, true);

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error resetting wagon PDI stage:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/rows/:rowId/pdi-force-complete", async (req, res) => {
  try {
    const submittedByRole = asText(req.user?.role) || asText(req.body?.submittedByRole);
    const submittedByUsername = asText(req.user?.username) || asText(req.body?.submittedByUsername);
    if (!["admin", "quality-admin"].includes(submittedByRole)) {
      return res.status(403).json({ success: false, message: "Only Quality Admin or Master Admin can complete a PDI entry." });
    }

    const { rowId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findById(rowId);
    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    const rowObject = row.toObject();
    const { inspectionRules, pdiRules } = getRowRuleSets(rowObject);
    const dailyProgress = getInspectionProgress(rowObject, inspectionRules);
    const pdiProgress = getPdiProgress(rowObject, pdiRules);
    if (!pdiProgress.isActivated) {
      return res.status(400).json({ success: false, message: "PDI stages are not active for this TEX No." });
    }

    const completedOn = formatStageDate();
    const completedAt = new Date();
    const completedBy = { username: submittedByUsername, role: submittedByRole };
    const markSkippedNotApplicable = (stage) => (
      stage.status === STAGE_STATUS.SKIPPED
        ? { ...stage, status: STAGE_STATUS.NOT_APPLICABLE, skipReason: "Marked N/A by admin completion" }
        : stage
    );
    const completePendingStage = (stage) => (
      stage.status === STAGE_STATUS.PENDING
        ? {
            ...stage,
            status: STAGE_STATUS.COMPLETED,
            completedOn,
            completedAt,
            completedBy,
            skippedOn: "",
            skippedBy: { username: "", role: "" },
            skipReason: "",
          }
        : markSkippedNotApplicable(stage)
    );

    const nextPdiProgress = getPdiProgress(
      {
        ...rowObject,
        pdiProgress: {
          ...row.pdiProgress?.toObject?.(),
          stages: pdiProgress.stages.map(completePendingStage),
          currentStageIndex: pdiProgress.stages.length,
          isActivated: true,
        },
      },
      pdiRules
    );
    row.pdiProgress = syncProgressPayload(nextPdiProgress, true);

    const nextDailyProgress = getInspectionProgress(
      {
        ...rowObject,
        inspectionProgress: {
          ...row.inspectionProgress?.toObject?.(),
          stages: dailyProgress.stages.map((stage) => {
            if (stage.status === STAGE_STATUS.SKIPPED) {
              return { ...stage, status: STAGE_STATUS.NOT_APPLICABLE, skipReason: "Marked N/A by admin completion" };
            }
            if (stage.key === "dm_line" && stage.status === STAGE_STATUS.PENDING) {
              return {
                ...stage,
                status: STAGE_STATUS.COMPLETED,
                completedOn,
                completedAt,
                completedBy,
                skippedOn: "",
                skippedBy: { username: "", role: "" },
                skipReason: "",
              };
            }
            return stage;
          }),
          currentStageIndex: 0,
        },
      },
      inspectionRules
    );
    row.inspectionProgress = syncProgressPayload(nextDailyProgress);

    await row.save();
    res.json({ success: true, data: buildStageDashboardRow(row.toObject()) });
  } catch (error) {
    console.error("Error force-completing wagon PDI:", error);
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

router.get("/rows/search", async (req, res) => {
  try {
    const field = asText(req.query.field);
    const query = asText(req.query.query);
    const validFields = new Set([
      "texNo",
      "wheelDataLink",
      "axleSerialNo",
      "wheelSerialNo",
      "bearingSerialNo",
      "bogieSerialNo",
      "couplerSerialNo",
      "draftGearSerialNo",
      "dvSerialNo",
      "bcSerialNo",
      "arSerialNo",
      "wagonNo",
    ]);

    if (!validFields.has(field) || !query) {
      return res.status(400).json({ success: false, message: "Choose a search field and enter a value." });
    }

    const [projects, rawRows] = await Promise.all([
      WagonDataSheetProject.find().lean(),
      WagonDataSheetRow.find({}).sort({ updatedAt: -1 }).lean(),
    ]);
    const projectMap = new Map(projects.map((project) => [String(project._id), project]));
    const rows = await attachLinkedWheelDataRows(rawRows);
    const normalizedQuery = query.toUpperCase();
    const hasMatch = (values) => values.some((value) => asText(value).toUpperCase().includes(normalizedQuery));
    const serialValues = (item) => Array.isArray(item) ? item : [];
    const componentSerialNumbers = (row, component) => [
      ...serialValues(row?.firstZone?.[component]?.serialNumbers),
      ...serialValues(row?.firstZone?.additionalComponents?.[component]?.serialNumbers),
    ];
    const sourcesFor = (row) => [row, ...(row.linkedWheelDataRows || [])];

    const matchesRow = (row) => {
      const sources = sourcesFor(row);
      const values = {
        texNo: [row.texNo],
        wheelDataLink: sources.flatMap((source) => [source.wheelDataKey, source.secondZone?.draftWheelDataKey]),
        axleSerialNo: sources.flatMap((source) => serialValues(source.secondZone?.axle?.serialNumbers)),
        wheelSerialNo: sources.flatMap((source) => serialValues(source.secondZone?.wheel?.serialNumbers)),
        bearingSerialNo: sources.flatMap((source) => serialValues(source.secondZone?.bearing?.serialNumbers)),
        bogieSerialNo: [row.firstZone?.bogie1SerialNumber, row.firstZone?.bogie2SerialNumber],
        couplerSerialNo: componentSerialNumbers(row, "coupler"),
        draftGearSerialNo: componentSerialNumbers(row, "draftGear"),
        dvSerialNo: componentSerialNumbers(row, "dv"),
        bcSerialNo: componentSerialNumbers(row, "bc"),
        arSerialNo: componentSerialNumbers(row, "ar"),
        wagonNo: [row.wagonNo],
      };
      return hasMatch(values[field] || []);
    };
    const joinValues = (values) => [...new Set(values.map(asText).filter(Boolean))].join(", ");
    const formSummary = (form) => ({
      filledOn: form?.submittedAt || null,
      filledBy: asText(form?.submittedBy?.username) || "-",
    });
    const results = rows
      .filter(matchesRow)
      .slice(0, 200)
      .map((row) => {
        const sources = sourcesFor(row);
        const project = projectMap.get(String(row.projectId || ""));
        return {
          rowId: String(row._id),
          projectName: asText(project?.projectName) || "Independent CTRB entry",
          projectPoNumber: asText(project?.contractPoNumber),
          slNo: asText(row.slNo),
          texNo: asText(row.texNo) || "-",
          wagonNo: asText(row.wagonNo) || "-",
          wheelDataLinks: joinValues(sources.map((source) => source.wheelDataKey)),
          axleSerialNumbers: joinValues(sources.flatMap((source) => serialValues(source.secondZone?.axle?.serialNumbers))),
          wheelSerialNumbers: joinValues(sources.flatMap((source) => serialValues(source.secondZone?.wheel?.serialNumbers))),
          bearingSerialNumbers: joinValues(sources.flatMap((source) => serialValues(source.secondZone?.bearing?.serialNumbers))),
          bogieSerialNumbers: joinValues([row.firstZone?.bogie1SerialNumber, row.firstZone?.bogie2SerialNumber]),
          ctrb: formSummary(row.secondZone),
          dmLine: formSummary(row.firstZone),
          dmFinal: formSummary(row.finalAssembly),
        };
      });

    res.json({ success: true, data: results, total: results.length, limit: 200 });
  } catch (error) {
    console.error("Error searching wagon data sheet records:", error);
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
    console.error("Error fetching pending DM Line Data rows:", error);
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
    const texNo = assertValidTexNo(req.body.texNo, false, existingRow?.texNo);
    const wagonNo = asText(req.body.wagonNo);

    await ensureUniqueWagonIdentifiers({
      rowId: existingRow?._id || null,
      projectId,
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
      bogie1Make: asText(req.body.bogieMake),
      bogie2Make: asText(req.body.hasDifferentBogie2Make ? req.body.bogie2Make : req.body.bogieMake),
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
      additionalComponents: {
        ...(row.firstZone?.additionalComponents?.toObject?.() || {}),
        coupler: {
          make: asText(req.body.couplerHasNewMake ? req.body.couplerNewMake : ""),
          serialNumbers: asSerialNumbers(req.body.couplerHasNewMake ? req.body.couplerNewSerialNumbers : "", "Coupler new make serial numbers"),
        },
        draftGear: {
          make: asText(req.body.draftGearHasNewMake ? req.body.draftGearNewMake : ""),
          serialNumbers: asSerialNumbers(req.body.draftGearHasNewMake ? req.body.draftGearNewSerialNumbers : "", "Draft gear new make serial numbers"),
        },
        dv: {
          make: asText(req.body.dvHasNewMake ? req.body.dvNewMake : ""),
          serialNumbers: asSerialNumbers(req.body.dvHasNewMake ? req.body.dvNewSerialNumbers : "", "DV new make serial numbers"),
        },
        bc: {
          make: asText(req.body.bcHasNewMake ? req.body.bcNewMake : ""),
          serialNumbers: asSerialNumbers(req.body.bcHasNewMake ? req.body.bcNewSerialNumbers : "", "BC new make serial numbers"),
        },
        ar: {
          make: asText(req.body.arHasNewMake ? req.body.arNewMake : ""),
          serialNumbers: asSerialNumbers(req.body.arHasNewMake ? req.body.arNewSerialNumbers : "", "AR new make serial numbers"),
        },
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
    console.error("Error saving DM Line Data row:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/drafts", async (req, res) => {
  try {
    const username = asText(req.query.username);
    if (!username) return res.status(400).json({ success: false, message: "Username is required." });
    const drafts = await WagonDataSheetDraft.find({ username }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: drafts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/drafts/:draftId", async (req, res) => {
  try {
    const username = asText(req.query.username);
    if (!username || !mongoose.Types.ObjectId.isValid(req.params.draftId)) {
      return res.status(400).json({ success: false, message: "Valid draftId and username are required." });
    }
    const draft = await WagonDataSheetDraft.findOne({ _id: req.params.draftId, username }).lean();
    if (!draft) return res.status(404).json({ success: false, message: "Draft not found." });
    res.json({ success: true, data: draft });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/drafts", async (req, res) => {
  try {
    const username = asText(req.body.username);
    const formType = asText(req.body.formType);
    const draftId = asText(req.body.draftId);
    if (!username || !["dm-line", "dm-final"].includes(formType)) {
      return res.status(400).json({ success: false, message: "Valid username and draft type are required." });
    }
    const draft = draftId
      ? await WagonDataSheetDraft.findOne({ _id: draftId, username, formType })
      : new WagonDataSheetDraft({ username, formType });
    if (!draft) return res.status(404).json({ success: false, message: "Draft not found." });
    draft.role = asText(req.body.role);
    draft.payload = req.body.payload || {};
    await draft.save();
    res.status(draftId ? 200 : 201).json({ success: true, data: draft });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete("/drafts/:draftId", async (req, res) => {
  try {
    const username = asText(req.query.username);
    if (!username || !mongoose.Types.ObjectId.isValid(req.params.draftId)) {
      return res.status(400).json({ success: false, message: "Valid draftId and username are required." });
    }
    await WagonDataSheetDraft.deleteOne({ _id: req.params.draftId, username });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/rows/second-zone/drafts", async (req, res) => {
  try {
    const username = asText(req.query.username);
    if (!username) return res.status(400).json({ success: false, message: "Username is required." });

    const drafts = await WagonDataSheetRow.find({
      "secondZone.isDraft": true,
      "secondZone.draftBy.username": username,
    }).sort({ "secondZone.draftSavedAt": -1 }).lean();
    res.json({ success: true, data: drafts });
  } catch (error) {
    console.error("Error fetching CTRB drafts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows/second-zone/drafts/:draftId", async (req, res) => {
  try {
    const username = asText(req.query.username);
    const { draftId } = req.params;
    if (!username || !mongoose.Types.ObjectId.isValid(draftId)) {
      return res.status(400).json({ success: false, message: "Valid draftId and username are required." });
    }
    const draft = await WagonDataSheetRow.findOne({
      _id: draftId,
      "secondZone.isDraft": true,
      "secondZone.draftBy.username": username,
    }).lean();
    if (!draft) return res.status(404).json({ success: false, message: "Draft not found." });
    res.json({ success: true, data: draft });
  } catch (error) {
    console.error("Error fetching CTRB draft:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/rows/second-zone/drafts", async (req, res) => {
  try {
    const username = asText(req.body.submittedByUsername);
    const draftId = asText(req.body.draftId);
    if (!username) return res.status(400).json({ success: false, message: "Inspector username is required." });
    if (draftId && !mongoose.Types.ObjectId.isValid(draftId)) {
      return res.status(400).json({ success: false, message: "Valid draftId is required." });
    }

    const existingDraft = draftId
      ? await WagonDataSheetRow.findOne({ _id: draftId, "secondZone.isDraft": true, "secondZone.draftBy.username": username })
      : null;
    if (draftId && !existingDraft) return res.status(404).json({ success: false, message: "Draft not found." });

    const draft = existingDraft || new WagonDataSheetRow({
      projectId: null,
      slNo: "",
      wheelDataKey: createInternalWheelDataKey("DRAFT"),
    });
    const axleSerialNumbers = asSerialNumbers(req.body.axleSerialNumbers, "Axle serial numbers", true);
    const wheelSerialNumbers = asSerialNumbers(req.body.wheelSerialNumbers, "Wheel serial numbers", true);
    draft.secondZone = {
      ...draft.secondZone?.toObject?.(),
      wheelDia: asText(req.body.wheelDia),
      wheelOrigin: asText(req.body.wheelOrigin),
      axle: { make: asText(req.body.axleMake), serialNumbers: axleSerialNumbers },
      axleHeatNumbers: asUniqueSerialHeatNumbers(req.body.axleHeatNumbers, req.body.axleSerialNumbers, "Axle"),
      wheel: { make: asText(req.body.wheelMake), serialNumbers: wheelSerialNumbers },
      wheelHeatNumbers: asUniqueSerialHeatNumbers(req.body.wheelHeatNumbers, req.body.wheelSerialNumbers, "Wheel"),
      bearing: { make: asText(req.body.bearingMake), serialNumbers: asSerialNumbers(req.body.bearingSerialNumbers, "Bearing serial numbers") },
      isDraft: true,
      draftWheelDataKey: normalizeWheelDataKey(req.body.wheelDataKey),
      draftBy: asSubmittedBy(req.body),
      draftSavedAt: new Date(),
      submittedBy: { username: "", role: "" },
      submittedAt: null,
    };
    await draft.save();
    res.status(existingDraft ? 200 : 201).json({ success: true, data: draft });
  } catch (error) {
    console.error("Error saving CTRB draft:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/rows/second-zone", async (req, res) => {
  try {
    const projectId = asProjectIdOrNull(req.body.projectId);
    const draftId = asText(req.body.draftId);
    const wheelDataKey = normalizeWheelDataKey(req.body.wheelDataKey);
    const wheelDia = asText(req.body.wheelDia);
    const wheelOrigin = asText(req.body.wheelOrigin);

    if (!wheelDataKey) {
      return res.status(400).json({ success: false, message: "Wheel data key is required." });
    }

    if (draftId && !mongoose.Types.ObjectId.isValid(draftId)) {
      return res.status(400).json({ success: false, message: "Valid draftId is required." });
    }
    const draft = draftId
      ? await WagonDataSheetRow.findOne({ _id: draftId, "secondZone.isDraft": true, "secondZone.draftBy.username": asText(req.body.submittedByUsername) })
      : null;
    if (draftId && !draft) return res.status(404).json({ success: false, message: "Draft not found." });

    const duplicateQuery = {
      projectId,
      wheelDataKey,
      "secondZone.wheelDia": buildExactMatchRegex(wheelDia),
      "secondZone.wheelOrigin": buildExactMatchRegex(wheelOrigin),
    };
    if (draft) duplicateQuery._id = { $ne: draft._id };
    const existingRow = await WagonDataSheetRow.findOne(duplicateQuery)
      .select("_id")
      .lean();
    if (existingRow) {
      return res.status(400).json({
        success: false,
        message: `Duplicate entry. Wheel Data Link ${wheelDataKey} with wheel dia ${wheelDia || "-"} and make ${wheelOrigin || "-"} already exists.`,
      });
    }

    const axleSerialNumbers = asSerialNumbers(req.body.axleSerialNumbers, "Axle serial numbers", true);
    const wheelSerialNumbers = asSerialNumbers(req.body.wheelSerialNumbers, "Wheel serial numbers", true);

    const row = draft || new WagonDataSheetRow({
      projectId,
      wheelDataKey,
      slNo: await getNextSlNo(projectId),
    });
    row.projectId = projectId;
    row.wheelDataKey = wheelDataKey;
    row.secondZone = {
        ...row.secondZone?.toObject?.(),
        wheelDia,
        wheelOrigin,
        axle: {
          make: asText(req.body.axleMake),
          serialNumbers: axleSerialNumbers,
        },
        axleHeatNumbers: asUniqueSerialHeatNumbers(req.body.axleHeatNumbers, req.body.axleSerialNumbers, "Axle"),
        wheel: {
          make: asText(req.body.wheelMake),
          serialNumbers: wheelSerialNumbers,
        },
        wheelHeatNumbers: asUniqueSerialHeatNumbers(req.body.wheelHeatNumbers, req.body.wheelSerialNumbers, "Wheel"),
        bearing: {
          make: asText(req.body.bearingMake),
          serialNumbers: asSerialNumbers(req.body.bearingSerialNumbers, "Bearing serial numbers"),
        },
        isDraft: false,
        draftWheelDataKey: "",
        draftBy: { username: "", role: "" },
        draftSavedAt: null,
        submittedBy: asSubmittedBy(req.body),
        submittedAt: new Date(),
    };
    await row.save();

    res.status(draft ? 200 : 201).json({ success: true, data: row });
  } catch (error) {
    console.error("Error saving CTRB wheel data row:", error);
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

router.use("/admin/rows", require("./wagonDataSheetAdmin.routes")({
  Row: WagonDataSheetRow,
  mongoose,
  authMiddleware,
  assertValidTexNo,
  asSerialNumbers,
  asUniqueSerialHeatNumbers,
  normalizeWheelDataKey,
}));

module.exports = router;
