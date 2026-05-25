import * as XLSX from "xlsx";

const EXCLUDED_SHEETS = [
  /^planning/i,
  /^whole\b/i,
  /^bom\b/i,
  /^warranty$/i,
  /^scrap$/i,
  /^steel/i,
  /^shortages$/i,
  /^sheet1$/i,
  /^door items$/i,
  /^bfnv index$/i,
];

const ACT1_SUMMARY_TO_SAP = {
  "LCCF Bogies": "RMMBOBG0051",
  "CTRB 'E' type": "RMMBOBR0221",
  "Wheel sets": "RMMBOWL0006",
  "Back Stop": "RMMBOBS0001",
  "Draft Gear": "RMMBODG0008",
  "Air brake equipment": "RMMBOAB0101",
  "Air brake pipe": "RMMBOAP0951",
};

function normalizeLabel(value) {
  return String(value || "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanText(value) {
  return String(value || "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = cleanText(value).replace(/,/g, "");
  if (!raw) return 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function slugify(value) {
  return cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getBaseProjectCode(sheetName) {
  return cleanText(sheetName)
    .toUpperCase()
    .split("_")[0]
    .trim();
}

function shouldSkipSheet(sheetName) {
  return EXCLUDED_SHEETS.some((pattern) => pattern.test(sheetName));
}

function findProjectHeaderRow(rows) {
  for (let index = 0; index < Math.min(rows.length, 15); index += 1) {
    const labels = rows[index].map(normalizeLabel).filter(Boolean);
    if (
      labels.some((cell) => cell.includes("item name") || cell.includes("item description")) &&
      labels.some((cell) => cell.includes("required")) &&
      labels.some((cell) => cell.includes("available"))
    ) {
      return index;
    }
  }
  return -1;
}

function findPlanningHeaderRow(rows) {
  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    const labels = rows[index].map(normalizeLabel);
    if (labels.includes("wagon type") && labels.some((cell) => cell.includes("total balance order"))) {
      return index;
    }
  }
  return -1;
}

function getColumnIndex(row, matcher) {
  return row.findIndex((cell) => matcher(normalizeLabel(cell)));
}

function findSubHeader(rows, startRow, startCol, matcher) {
  for (let rowIndex = startRow; rowIndex <= Math.min(startRow + 3, rows.length - 1); rowIndex += 1) {
    for (let colIndex = Math.max(0, startCol - 1); colIndex <= Math.min(startCol + 4, rows[rowIndex].length - 1); colIndex += 1) {
      if (matcher(normalizeLabel(rows[rowIndex][colIndex]))) {
        return colIndex;
      }
    }
  }
  return -1;
}

function parsePlanningSheet(rows) {
  const headerRow = findPlanningHeaderRow(rows);
  if (headerRow === -1) return new Map();

  const header = rows[headerRow].map(cleanText);
  const wagonTypeCol = getColumnIndex(header, (cell) => cell === "wagon type");
  const clientCol = getColumnIndex(header, (cell) => cell === "client");
  const totalOrderCol = getColumnIndex(header, (cell) => cell.includes("total balance order"));

  const monthColumns = header
    .map((cell, index) => ({ cell, index }))
    .filter(({ index }) => index > totalOrderCol && cleanText(header[index]));

  const planningMap = new Map();

  for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const wagonType = cleanText(row[wagonTypeCol]);
    if (!wagonType) continue;

    const baseCode = wagonType.toUpperCase();
    const planningMonths = monthColumns
      .map(({ cell, index }) => ({
        month: cleanText(cell),
        plannedQty: toNumber(row[index]),
      }))
      .filter((entry) => entry.month);

    planningMap.set(baseCode, {
      client: cleanText(row[clientCol]),
      totalOrderQty: toNumber(row[totalOrderCol]),
      planningMonths,
    });
  }

  return planningMap;
}

function parseAct1DetailSheet(rows, planning) {
  const headerRow = rows.findIndex((row) => normalizeLabel(row[0]) === "sap code");
  if (headerRow === -1) return null;

  const header = rows[headerRow].map(cleanText);
  const sapCodeCol = getColumnIndex(header, (cell) => cell === "sap code");
  const descriptionCol = getColumnIndex(header, (cell) => cell === "description");
  const qtyPerWagonCol = getColumnIndex(header, (cell) => cell.includes("qty / wagon"));
  const unitCol = getColumnIndex(header, (cell) => cell === "uom");
  const requiredQtyCol = getColumnIndex(header, (cell) => cell.includes("required in nos"));
  const totalAvailableNoCol = getColumnIndex(header, (cell) => cell === "no.");
  const totalAvailableWsCol = getColumnIndex(header, (cell) => cell === "ws");
  const totalShortageNoCol = header.findIndex((_, index) => index > totalAvailableWsCol && normalizeLabel(header[index]) === "no.");
  const totalShortageWsCol = header.findIndex((_, index) => index > totalAvailableWsCol && normalizeLabel(header[index]) === "ws");
  const remarksCol = getColumnIndex(header, (cell) => cell === "remarks");

  const rakeHeadersTop = rows[headerRow - 1] || [];
  const rakeHeadersBottom = rows[headerRow + 1] || [];
  const rakeColumns = [];
  for (let colIndex = remarksCol + 1; colIndex < header.length; colIndex += 2) {
    const top = cleanText(rakeHeadersTop[colIndex]);
    const bottom = cleanText(rakeHeadersBottom[colIndex]);
    if (!top && !bottom) continue;

    rakeColumns.push({
      label: [top, bottom].filter(Boolean).join(" / "),
      availableCol: colIndex,
      shortageCol: colIndex + 1,
    });
  }

  const materials = [];

  for (let rowIndex = headerRow + 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const sapCode = cleanText(row[sapCodeCol]);
    const description = cleanText(row[descriptionCol]);

    if (!sapCode || !description) continue;

    const rakeReadiness = rakeColumns.map((entry) => ({
      label: entry.label,
      availableWs: cleanText(row[entry.availableCol]) || "0",
      shortageWs: cleanText(row[entry.shortageCol]) || "0",
      status: String(cleanText(row[entry.shortageCol]) || "").toUpperCase() === "OK" ? "OK" : "SHORT",
    }));

    materials.push({
      projectCode: "ACT1",
      materialCode: sapCode,
      itemName: description,
      qtyPerWagon: toNumber(row[qtyPerWagonCol]),
      unit: cleanText(row[unitCol]),
      requiredQty: toNumber(row[requiredQtyCol]),
      availableQty: toNumber(row[totalAvailableNoCol]),
      availableWs: toNumber(row[totalAvailableWsCol]),
      inTransitQty: 0,
      shortageQty: toNumber(row[totalShortageNoCol]),
      remarks: cleanText(row[remarksCol]),
      sourceSheet: "ACT1_267",
      extra: {
        abstractionLevel: "detail",
        summaryProjectCode: "ACT1",
        totalShortageWs: toNumber(row[totalShortageWsCol]),
        sapCode,
        summaryGroup:
          Object.entries(ACT1_SUMMARY_TO_SAP).find(([, mappedSap]) => mappedSap === sapCode)?.[0] || description,
        rakeReadiness,
      },
    });
  }

  return {
    project: {
      projectCode: "ACT1",
      projectName: "ACT1 Material Readiness",
      client: planning.client || "IVCLL / APL / STPL",
      wagonType: "ACT1",
      totalOrderQty: planning.totalOrderQty || 267,
      sourceSheets: ["ACT1_267"],
      planningMonths: planning.planningMonths || [],
      activeStatus: "Active",
      extra: {
        moduleType: "act1-readiness",
        sourceOfTruthSheet: "ACT1_267",
      },
    },
    materials,
  };
}

function parseAct1SummarySheet(rows, planning) {
  const headerRow = rows.findIndex((row) => normalizeLabel(row[1]) === "sl no");
  if (headerRow === -1) return null;

  const projectName = cleanText(rows[headerRow - 1]?.find((cell) => cleanText(cell)));
  const dateText = cleanText((rows[headerRow - 2] || []).find((cell) => cleanText(cell).toLowerCase().includes("date")));
  const poTexts = (rows[headerRow - 2] || [])
    .concat(rows[headerRow - 1] || [])
    .map(cleanText)
    .filter((cell) => /po no/i.test(cell));

  const summaryRows = [];

  for (let rowIndex = headerRow + 4; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const itemName = cleanText(row[2]);
    if (!itemName) continue;

    summaryRows.push({
      itemName,
      qtyPerWagon: toNumber(row[3]),
      unit: cleanText(row[4]),
      requiredQty: toNumber(row[5]),
      availableQty: toNumber(row[6]),
      availableWs: toNumber(row[7]),
      monthRisk: [
        cleanText(row[8]),
        cleanText(row[9]),
        cleanText(row[10]),
        cleanText(row[11]),
        cleanText(row[12]),
      ].filter(Boolean),
      remarks: cleanText(row[13]),
      mappedSapCode: ACT1_SUMMARY_TO_SAP[itemName] || "",
    });
  }

  return {
    projectCode: "ACT1",
    projectName: projectName || "ACT1 Material Readiness",
    client: planning.client || "IVCLL / APL / STPL",
    wagonType: "ACT1",
    totalOrderQty: planning.totalOrderQty || 267,
    sourceSheets: ["ACT1_New"],
    planningMonths: planning.planningMonths || [],
    activeStatus: "Active",
    extra: {
      moduleType: "act1-readiness",
      summarySheetSource: "ACT1_New",
      summaryDate: dateText,
      poReferences: poTexts,
      managementSummaryRows: summaryRows,
    },
  };
}

function parseGenericProjectSheet(sheetName, rows, planningMap) {
  const headerRow = findProjectHeaderRow(rows);
  if (headerRow === -1) return null;

  const header = rows[headerRow].map(cleanText);
  const itemNameCol = getColumnIndex(header, (cell) => cell.includes("item name") || cell.includes("item description"));
  const qtyPerWagonCol = getColumnIndex(header, (cell) => cell.includes("qty"));
  const unitCol = getColumnIndex(header, (cell) => cell === "unit");
  const requiredQtyCol = getColumnIndex(header, (cell) => cell.includes("required"));
  const availableStartCol = getColumnIndex(header, (cell) => cell.includes("available"));

  if (itemNameCol === -1 || requiredQtyCol === -1 || availableStartCol === -1) {
    return null;
  }

  const availableNoCol = findSubHeader(rows, headerRow + 1, availableStartCol, (cell) => cell === "no.");
  const availableQtyCol = availableNoCol >= 0 ? availableNoCol : availableStartCol;
  const availableWsCol = findSubHeader(rows, headerRow + 1, availableStartCol + 1, (cell) => cell === "w/s");

  const titleRow = Math.max(0, headerRow - 1);
  const projectName = cleanText(rows[titleRow]?.find((cell) => cleanText(cell)));
  const baseCode = getBaseProjectCode(sheetName);
  const projectCode = baseCode || cleanText(sheetName).toUpperCase();
  const planning = planningMap.get(baseCode) || planningMap.get(projectCode) || {};
  const materials = [];

  let dataStarted = false;
  let blankRun = 0;

  for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const itemName = cleanText(row[itemNameCol]);
    const requiredQty = toNumber(row[requiredQtyCol]);
    const availableQty = toNumber(row[availableQtyCol]);

    if (!itemName && !requiredQty && !availableQty) {
      if (dataStarted) blankRun += 1;
      if (blankRun >= 3) break;
      continue;
    }

    const serialLike = toNumber(row[itemNameCol - 1]);
    if (!dataStarted && !itemName) continue;
    if (!dataStarted && serialLike === 0 && requiredQty === 0 && availableQty === 0) continue;

    dataStarted = true;
    blankRun = 0;

    const availableWs = availableWsCol >= 0 ? toNumber(row[availableWsCol]) : 0;
    const shortageQty = Math.max(requiredQty - availableQty, 0);
    const trailingText = row
      .slice(Math.max(availableWsCol, availableQtyCol) + 1)
      .map(cleanText)
      .filter(Boolean);

    materials.push({
      projectCode,
      materialCode: `${projectCode}-${slugify(itemName).slice(0, 80)}`,
      itemName,
      qtyPerWagon: qtyPerWagonCol >= 0 ? toNumber(row[qtyPerWagonCol]) : 0,
      unit: unitCol >= 0 ? cleanText(row[unitCol]) : "",
      requiredQty,
      availableQty,
      availableWs,
      inTransitQty: 0,
      shortageQty,
      remarks: trailingText.join(" | ").slice(0, 500),
      sourceSheet: sheetName,
      extra: {
        abstractionLevel: "detail",
      },
    });
  }

  if (!materials.length) return null;

  return {
    project: {
      projectCode,
      projectName: projectName || sheetName,
      client: planning.client || "",
      wagonType: baseCode || projectCode,
      totalOrderQty: planning.totalOrderQty || 0,
      sourceSheets: [sheetName],
      planningMonths: planning.planningMonths || [],
      activeStatus: "Active",
      extra: {
        moduleType: "generic-shortage",
      },
    },
    materials,
  };
}

function mergeProject(projectMap, incomingProject) {
  const existingProject = projectMap.get(incomingProject.projectCode);
  if (!existingProject) {
    projectMap.set(incomingProject.projectCode, incomingProject);
    return;
  }

  existingProject.sourceSheets = [...new Set([...(existingProject.sourceSheets || []), ...(incomingProject.sourceSheets || [])])];
  existingProject.totalOrderQty = existingProject.totalOrderQty || incomingProject.totalOrderQty;
  existingProject.client = existingProject.client || incomingProject.client;
  existingProject.planningMonths = existingProject.planningMonths?.length
    ? existingProject.planningMonths
    : incomingProject.planningMonths;
  existingProject.projectName = existingProject.projectName || incomingProject.projectName;
  existingProject.extra = {
    ...(existingProject.extra || {}),
    ...(incomingProject.extra || {}),
  };
}

export async function parseProjectShortageWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const planningMap = new Map();

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      blankrows: false,
      defval: null,
      raw: false,
    });

    if (/^planning/i.test(sheetName)) {
      const parsedPlanning = parsePlanningSheet(rows);
      for (const [key, value] of parsedPlanning.entries()) {
        planningMap.set(key, value);
      }
    }
  }

  const projectMap = new Map();
  const materials = [];
  const parsedSheets = [];

  if (workbook.Sheets.ACT1_267) {
    const detailRows = XLSX.utils.sheet_to_json(workbook.Sheets.ACT1_267, {
      header: 1,
      blankrows: false,
      defval: null,
      raw: false,
    });
    const act1Detail = parseAct1DetailSheet(detailRows, planningMap.get("ACT1") || {});
    if (act1Detail) {
      mergeProject(projectMap, act1Detail.project);
      materials.push(...act1Detail.materials);
      parsedSheets.push("ACT1_267");
    }
  }

  if (workbook.Sheets.ACT1_New) {
    const summaryRows = XLSX.utils.sheet_to_json(workbook.Sheets.ACT1_New, {
      header: 1,
      blankrows: false,
      defval: null,
      raw: false,
    });
    const act1Summary = parseAct1SummarySheet(summaryRows, planningMap.get("ACT1") || {});
    if (act1Summary) {
      mergeProject(projectMap, act1Summary);
      parsedSheets.push("ACT1_New");
    }
  }

  for (const sheetName of workbook.SheetNames) {
    if (shouldSkipSheet(sheetName) || sheetName === "ACT1_New" || sheetName === "ACT1_267") continue;

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      blankrows: false,
      defval: null,
      raw: false,
    });

    const parsed = parseGenericProjectSheet(sheetName, rows, planningMap);
    if (!parsed) continue;

    mergeProject(projectMap, parsed.project);
    materials.push(...parsed.materials);
    parsedSheets.push(sheetName);
  }

  return {
    projects: Array.from(projectMap.values()),
    materials,
    meta: {
      workbookName: file.name,
      parsedSheets,
      totalSheets: workbook.SheetNames.length,
    },
  };
}
