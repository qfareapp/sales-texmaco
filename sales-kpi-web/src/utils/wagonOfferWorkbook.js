import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const text = (value) => String(value || "").trim();
const textOrDash = (value) => text(value) || "-";
const formatDate = (value) => {
  const raw = text(value);
  if (!raw) {
    return "";
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return raw;
  }

  return `${match[3]}.${match[2]}.${match[1]}`;
};
const fileSafe = (value) => String(value || "project").replace(/[\\/:*?"<>|]+/g, "_");
const applyCellStyle = (ws, ref, style) => {
  if (ws[ref]) {
    ws[ref].s = style;
  }
};
const applyRangeStyle = (ws, startRow, endRow, startCol, endCol, style) => {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      applyCellStyle(ws, XLSX.utils.encode_cell({ r: row, c: col }), style);
    }
  }
};
const repeatMakeForCount = (make, count) => {
  const cleanMake = text(make);
  if (!cleanMake) {
    return "-";
  }
  return new Array(Math.max(count, 1)).fill(cleanMake).join("  ");
};
const combineValues = (values, separator = "  ") => {
  const cleanValues = values.map(text).filter(Boolean);
  return cleanValues.length ? cleanValues.join(separator) : "-";
};
const joinSerialNumbers = (values, separator = " ") => {
  return combineValues(Array.isArray(values) ? values : [], separator);
};
const linkedComponentValues = (row, key, field) => {
  const values = (row?.linkedWheelDataRows || [])
    .flatMap((item) => {
      const data = item?.secondZone?.[key];
      if (!data) {
        return [];
      }

      return field === "make" ? [data.make] : data.serialNumbers || [];
    })
    .map(text)
    .filter(Boolean);

  return values.length ? values.join(field === "make" ? "  " : " ") : "-";
};
const wagonIdentifier = (row) => textOrDash(row?.wagonNo);
const contractPoSummary = (project) => {
  const parts = [text(project.contractPoNumber)];
  const poDate = formatDate(project.contractPoDate);
  const dpDate = formatDate(project.deliveryPeriodUpto);

  if (poDate) {
    parts.push(`Dtd. ${poDate}`);
  }
  if (dpDate) {
    parts.push(`D.P. ${dpDate}`);
  }

  return parts.filter(Boolean).join(" ");
};
const totalQuantitySummary = (project) => {
  const quantity = text(project.totalQuantity);
  const wagonType = text(project.wagonTypeInPo);
  return [quantity, wagonType].filter(Boolean).join(" / ") || "-";
};
const offeredSummary = (project, rows) => {
  const countText = text(project.wagonsOfferedForInspection) || `${rows.length} Nos`;
  const dateText = formatDate(project.inspectionOfferDate);
  return dateText ? `${countText} Dtd. ${dateText}` : countText;
};

export function downloadWagonOfferWorkbook(project, rows) {
  const styles = {
    metaLabel: {
      font: { bold: true, name: "Calibri", sz: 11 },
      alignment: { horizontal: "left", vertical: "top", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    },
    metaValue: {
      font: { name: "Calibri", sz: 11 },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    },
    header: {
      font: { bold: true, name: "Calibri", sz: 11 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    },
    subHeader: {
      font: { name: "Calibri", sz: 11 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    },
    bodyCenter: {
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
      font: { name: "Calibri", sz: 11 },
    },
  };

  const metadataRows = [
    ["Contract/P.O. No. and date and D.P. (Upto)", "", "", "", "", "", "", "", contractPoSummary(project)],
    ["Total Quantity/type of Wagon in PO", "", "", "", "", "", "", "", totalQuantitySummary(project)],
    ["Contract/P.O. placed by", "", "", "", "", "", "", "", textOrDash(project.contractPlacedBy)],
    ["Name of the wagon manufacturer", "", "", "", "", "", "", "", textOrDash(project.wagonManufacturer)],
    ["Type of Wagon offered", "", "", "", "", "", "", "", textOrDash(project.wagonTypeOffered || project.wagonTypeInPo)],
    ["No of Wagons offered  for Inspection (Up to 20 wagons)", "", "", "", "", "", "", "", offeredSummary(project, rows)],
    ["Details of offered Wagons"],
    ["S.N.", "Wagon  No.", "Bogie", "", "Coupler", "", "DV", "", "Bearing", "", "Brake Cylinder", "", "Draft Gear", "", "CRF Make", "TEX No."],
    ["", "", "Make", "Sr. No.", "Make", "Sr. No.", "Make", "Sr. No.", "Make", "Sr. No.", "Make", "Sr. No.", "Make", "Sr. No.", "", ""],
  ];

  const bodyRows = rows.map((row, index) => {
    const bogieSerialNumbers = [row?.firstZone?.bogie1SerialNumber, row?.firstZone?.bogie2SerialNumber].map(text).filter(Boolean);
    const couplerSerialNumbers = Array.isArray(row?.firstZone?.coupler?.serialNumbers)
      ? row.firstZone.coupler.serialNumbers
      : [];
    const draftGearSerialNumbers = Array.isArray(row?.firstZone?.draftGear?.serialNumbers)
      ? row.firstZone.draftGear.serialNumbers
      : [];

    return [
      row?.slNo || index + 1,
      wagonIdentifier(row),
      repeatMakeForCount(row?.firstZone?.bogie?.make, bogieSerialNumbers.length || 2),
      combineValues(bogieSerialNumbers),
      repeatMakeForCount(row?.firstZone?.coupler?.make, couplerSerialNumbers.length || 2),
      joinSerialNumbers(couplerSerialNumbers),
      textOrDash(row?.firstZone?.dv?.make),
      joinSerialNumbers(row?.firstZone?.dv?.serialNumbers || []),
      linkedComponentValues(row, "bearing", "make"),
      linkedComponentValues(row, "bearing", "serialNumbers"),
      textOrDash(row?.firstZone?.bc?.make),
      joinSerialNumbers(row?.firstZone?.bc?.serialNumbers || []),
      repeatMakeForCount(row?.firstZone?.draftGear?.make, draftGearSerialNumbers.length || 2),
      joinSerialNumbers(draftGearSerialNumbers),
      textOrDash(row?.firstZone?.crfMake),
      textOrDash(row?.texNo),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([...metadataRows, ...bodyRows]);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 0, c: 8 }, e: { r: 0, c: 14 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 1, c: 8 }, e: { r: 1, c: 14 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
    { s: { r: 2, c: 8 }, e: { r: 2, c: 14 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
    { s: { r: 3, c: 8 }, e: { r: 3, c: 14 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },
    { s: { r: 4, c: 8 }, e: { r: 4, c: 14 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } },
    { s: { r: 5, c: 8 }, e: { r: 5, c: 14 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 15 } },
    { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },
    { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } },
    { s: { r: 7, c: 2 }, e: { r: 7, c: 3 } },
    { s: { r: 7, c: 4 }, e: { r: 7, c: 5 } },
    { s: { r: 7, c: 6 }, e: { r: 7, c: 7 } },
    { s: { r: 7, c: 8 }, e: { r: 7, c: 9 } },
    { s: { r: 7, c: 10 }, e: { r: 7, c: 11 } },
    { s: { r: 7, c: 12 }, e: { r: 7, c: 13 } },
    { s: { r: 7, c: 14 }, e: { r: 8, c: 14 } },
    { s: { r: 7, c: 15 }, e: { r: 8, c: 15 } },
  ];

  ws["!cols"] = [
    { wch: 5.5 },
    { wch: 15.5 },
    { wch: 7 },
    { wch: 8.5 },
    { wch: 8.2 },
    { wch: 7.8 },
    { wch: 8 },
    { wch: 7.3 },
    { wch: 9.2 },
    { wch: 20 },
    { wch: 8.5 },
    { wch: 7.5 },
    { wch: 7.3 },
    { wch: 8 },
    { wch: 7.8 },
    { wch: 12 },
  ];

  ws["!rows"] = [
    { hpt: 12.6 },
    { hpt: 12.6 },
    { hpt: 12.6 },
    { hpt: 12.6 },
    { hpt: 12.6 },
    { hpt: 12.6 },
    { hpt: 13.5 },
    { hpt: 20.25 },
    { hpt: 16.5 },
    ...bodyRows.map(() => ({ hpt: 42 })),
  ];

  applyRangeStyle(ws, 0, 5, 0, 7, styles.metaLabel);
  applyRangeStyle(ws, 0, 5, 8, 14, styles.metaValue);
  applyRangeStyle(ws, 6, 6, 0, 15, styles.metaLabel);
  applyRangeStyle(ws, 7, 7, 0, 15, styles.header);
  applyRangeStyle(ws, 8, 8, 0, 15, styles.subHeader);
  if (bodyRows.length > 0) {
    applyRangeStyle(ws, 9, 8 + bodyRows.length, 0, 15, styles.bodyCenter);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(project.projectName || "Wagon Offer").slice(0, 31));

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    `Wagon Offer Copy - ${fileSafe(project.projectName)}.xlsx`
  );
}
