import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const text = (value) => String(value || "").trim();
const fileSafe = (value) => String(value || "project").replace(/[\\/:*?"<>|]+/g, "_");
const formatDate = (value) => {
  const raw = text(value);
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}-${month}-${year}`;
  }

  return raw;
};
const formatMonthYear = (value) => {
  const raw = text(value);
  if (!raw) {
    return "";
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return raw;
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[Number(match[2]) - 1]} ${match[1]}`;
};
const titleText = (project) => {
  const wagonType = text(project?.wagonTypeOffered || project?.wagonTypeInPo || "Wagons");
  const account = text(project?.contractPlacedBy);
  return account
    ? `List of ${wagonType} (${account})2ND Rake`
    : `List of ${wagonType}`;
};

export function downloadWagonCocWorkbook(project, rows) {
  const header = [[
    "Sl. No.",
    "Wagon Number(s)",
    "Tare weight",
    "TYPE OFWAGON",
    "DM No",
    "DM Date",
    "ROH Date",
    "POH Date",
  ]];

  const body = rows.map((row, index) => [
    row?.slNo || index + 1,
    text(row?.wagonNo),
    text(row?.finalAssembly?.tareWeight),
    text(project?.wagonTypeOffered || project?.wagonTypeInPo),
    text(row?.finalAssembly?.dmNo),
    formatDate(row?.finalAssembly?.dmDate),
    formatMonthYear(row?.finalAssembly?.rohDate),
    formatMonthYear(row?.finalAssembly?.returnOrPohDate),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([[titleText(project)], ...header, ...body]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  ws["!cols"] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
  ];
  ws["!rows"] = [
    { hpt: 22 },
    { hpt: 22 },
    ...body.map(() => ({ hpt: 28 })),
  ];

  const border = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
  const titleStyle = {
    font: { bold: true, name: "Calibri", sz: 12 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  };
  const headerStyle = {
    font: { bold: true, name: "Calibri", sz: 11 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  };
  const bodyStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  };

  const applyStyle = (startRow, endRow, startCol, endCol, style) => {
    for (let r = startRow; r <= endRow; r += 1) {
      for (let c = startCol; c <= endCol; c += 1) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) {
          ws[ref].s = style;
        }
      }
    }
  };

  applyStyle(0, 0, 0, 7, titleStyle);
  applyStyle(1, 1, 0, 7, headerStyle);
  if (body.length > 0) {
    applyStyle(2, body.length + 1, 0, 7, bodyStyle);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    `COC OF Wagon - ${fileSafe(project?.projectName)}.xlsx`
  );
}
