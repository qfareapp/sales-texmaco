import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const text = (value) => String(value || "").trim();
const textOrDash = (value) => text(value) || "-";
const fileSafe = (value) => String(value || "project").replace(/[\\/:*?"<>|]+/g, "_");
const formatDate = (value) => {
  const raw = text(value);
  if (!raw) {
    return "-";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}-${month}-${year}`;
  }

  return raw;
};
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
const combineValues = (values, separator = " ") => {
  const cleanValues = values.map(text).filter(Boolean);
  return cleanValues.length ? cleanValues.join(separator) : "-";
};
const linkedSerials = (row, key) =>
  combineValues(
    (row?.linkedWheelDataRows || []).flatMap((item) => item?.secondZone?.[key]?.serialNumbers || []),
    " "
  );
const bogieCell = (row) =>
  combineValues(
    [
      text(row?.firstZone?.bogie?.make),
      text(row?.firstZone?.bogie1SerialNumber),
      text(row?.firstZone?.bogie2SerialNumber),
    ],
    " "
  );
const couplerCell = (row) =>
  combineValues(
    [text(row?.firstZone?.coupler?.make), ...(row?.firstZone?.coupler?.serialNumbers || [])],
    " "
  );
const draftGearCell = (row) =>
  combineValues(
    [text(row?.firstZone?.draftGear?.make), ...(row?.firstZone?.draftGear?.serialNumbers || [])],
    " "
  );
const dvCell = (row) =>
  combineValues([text(row?.firstZone?.dv?.make), ...(row?.firstZone?.dv?.serialNumbers || [])], " ");
const combinedRfid = (row) =>
  combineValues([row?.finalAssembly?.rfidNo1, row?.finalAssembly?.rfidNo2], " ");
const titleText = (project) => {
  const wagonType = text(project?.wagonTypeOffered || project?.wagonTypeInPo);
  const account = text(project?.contractPlacedBy);
  const projectName = text(project?.projectName);

  if (wagonType && account) {
    return `WAGON HISTORY SHEET OF ${wagonType} A/c ${account}`;
  }
  if (projectName) {
    return `WAGON HISTORY SHEET OF ${projectName}`;
  }
  return "WAGON HISTORY SHEET";
};

export function downloadWagonElectronicsWorkbook(project, rows) {
  const styles = {
    title: {
      font: { bold: true, name: "Calibri", sz: 12 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
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
    body: {
      font: { bold: true, name: "Calibri", sz: 11 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    },
  };

  const headerRow = [[
    "SL.NO",
    "TEX NO.",
    "WAGON NO. ",
    "BOGIE MAKE- TEXMACO & SL. NO.",
    "CBC MAKE: TEXMACO",
    "DRAFT GEAR MAKE: WC",
    "D.V MAKE:\nESCORT ",
    "SAB MAKE: \nGeneral Store",
    "AXLE NO. ",
    "WHEEL NO.",
    "BEARING NO.",
    "TARE WEIGHT (TONNE)",
    "TXR FIT",
    "MFG. DATE",
    "RFID",
    "RETURN DATE",
  ]];

  const bodyRows = rows.map((row, index) => [
    row?.slNo || index + 1,
    textOrDash(row?.texNo),
    textOrDash(row?.wagonNo),
    bogieCell(row),
    couplerCell(row),
    draftGearCell(row),
    dvCell(row),
    textOrDash(row?.firstZone?.sabMake),
    linkedSerials(row, "axle"),
    linkedSerials(row, "wheel"),
    linkedSerials(row, "bearing"),
    textOrDash(row?.finalAssembly?.tareWeight),
    formatDate(row?.finalAssembly?.txrFitDate),
    formatDate(row?.finalAssembly?.manufactureDate),
    combinedRfid(row),
    formatDate(row?.finalAssembly?.returnOrPohDate),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([[titleText(project)], [], ...headerRow, ...bodyRows]);

  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 15 } }];
  ws["!cols"] = [
    { wch: 8.1 },
    { wch: 10.3 },
    { wch: 14.4 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 9 },
    { wch: 13.5 },
    { wch: 14.5 },
    { wch: 10 },
    { wch: 10.7 },
  ];
  ws["!rows"] = [
    { hpt: 15.75 },
    { hpt: 15.75 },
    { hpt: 75 },
    ...bodyRows.map(() => ({ hpt: 126 })),
  ];

  applyRangeStyle(ws, 0, 0, 0, 15, styles.title);
  applyRangeStyle(ws, 2, 2, 0, 15, styles.header);
  if (bodyRows.length > 0) {
    applyRangeStyle(ws, 3, 2 + bodyRows.length, 0, 15, styles.body);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    `Wagon Electronics Data Sheet - ${fileSafe(project?.projectName)}.xlsx`
  );
}
