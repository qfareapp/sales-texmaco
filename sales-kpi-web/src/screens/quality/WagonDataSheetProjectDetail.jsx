import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { downloadWagonOfferWorkbook } from "../../utils/wagonOfferWorkbook";
import { downloadWagonOfferPdf } from "../../utils/wagonOfferPdf";
import { downloadWagonElectronicsWorkbook } from "../../utils/wagonElectronicsWorkbook";
import { downloadWagonCocWorkbook } from "../../utils/wagonCocWorkbook";

const joinSerials = (value) => (Array.isArray(value) && value.length ? value.join(", ") : "—");
const textOrDash = (value) => (value ? String(value) : "—");
const finalValue = (row, key) => row?.finalAssembly?.[key] || row?.secondZone?.[key] || "";
const fileSafe = (value) => String(value || "project").replace(/[\\/:*?"<>|]+/g, "_");
const wheelDataLinksForBogie = (row, bogieKey) =>
  (row?.firstZone?.[bogieKey] || []).map((item) => item?.wheelDataKey).filter(Boolean);
const linkedWheelKeyMapping = (row) => {
  const bogie1SerialNumber = textOrDash(row?.firstZone?.bogie1SerialNumber);
  const bogie2SerialNumber = textOrDash(row?.firstZone?.bogie2SerialNumber);
  const bogie1Links = wheelDataLinksForBogie(row, "bogie1WheelDataRows");
  const bogie2Links = wheelDataLinksForBogie(row, "bogie2WheelDataRows");

  return [
    `B1 [${bogie1SerialNumber}]: ${bogie1Links.length ? bogie1Links.join(", ") : "â€”"}`,
    `B2 [${bogie2SerialNumber}]: ${bogie2Links.length ? bogie2Links.join(", ") : "â€”"}`,
  ].join("\n");
};
const linkedWheelKeys = (row) =>
  row?.linkedWheelDataRows?.length ? row.linkedWheelDataRows.map((item) => item.wheelDataKey).join(", ") : "—";
const linkedWheelMakes = (row, key) => {
  const values = [...new Set((row?.linkedWheelDataRows || []).map((item) => item?.secondZone?.[key]?.make).filter(Boolean))];
  return values.length ? values.join(", ") : "—";
};
const linkedWheelSerials = (row, key) => {
  const values = (row?.linkedWheelDataRows || []).flatMap((item) => item?.secondZone?.[key]?.serialNumbers || []).filter(Boolean);
  return values.length ? values.join(", ") : "—";
};
const bogieSerialSummary = (row) =>
  [row?.firstZone?.bogie1SerialNumber, row?.firstZone?.bogie2SerialNumber].filter(Boolean).join(", ") || "—";

const safeText = (value) => (value ? String(value) : "-");
const safeJoinSerials = (value) => (Array.isArray(value) && value.length ? value.join(", ") : "-");
const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
const safeLinkedWheelMakes = (row, key) => {
  const values = [...new Set((row?.linkedWheelDataRows || []).map((item) => item?.secondZone?.[key]?.make).filter(Boolean))];
  return values.length ? values.join(", ") : "-";
};
const safeLinkedWheelSerials = (row, key) => {
  const values = (row?.linkedWheelDataRows || []).flatMap((item) => item?.secondZone?.[key]?.serialNumbers || []).filter(Boolean);
  return values.length ? values.join(", ") : "-";
};
const safeBogieSerialSummary = (row) =>
  [row?.firstZone?.bogie1SerialNumber, row?.firstZone?.bogie2SerialNumber].filter(Boolean).join(", ") || "-";
const safeLinkedWheelKeyMapping = (row) => {
  const bogie1SerialNumber = safeText(row?.firstZone?.bogie1SerialNumber);
  const bogie2SerialNumber = safeText(row?.firstZone?.bogie2SerialNumber);
  const bogie1Links = wheelDataLinksForBogie(row, "bogie1WheelDataRows");
  const bogie2Links = wheelDataLinksForBogie(row, "bogie2WheelDataRows");

  return [
    `B1 [${bogie1SerialNumber}]: ${bogie1Links.length ? bogie1Links.join(", ") : "-"}`,
    `B2 [${bogie2SerialNumber}]: ${bogie2Links.length ? bogie2Links.join(", ") : "-"}`,
  ].join("\n");
};
const combinedRfidNumbers = (row) =>
  [finalValue(row, "rfidNo1"), finalValue(row, "rfidNo2")]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n") || "-";

const applyCellStyle = (ws, ref, style) => {
  if (ws[ref]) ws[ref].s = style;
};

const applyRangeStyle = (ws, startRow, endRow, startCol, endCol, style) => {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      applyCellStyle(ws, ref, style);
    }
  }
};

function HeaderCell({ children, sx = {}, ...props }) {
  return (
    <TableCell
      {...props}
      sx={{
        fontWeight: 700,
        whiteSpace: "nowrap",
        borderColor: "#cbd5e1",
        ...sx,
      }}
    >
      {children}
    </TableCell>
  );
}

export default function WagonDataSheetProjectDetail() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/wagon-data-sheet/projects/${projectId}/detail`);
        setProject(data?.data?.project || null);
        setRows(data?.data?.rows || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load project details.");
      }
    };
    load();
  }, [projectId]);

  const offeredCount = useMemo(() => rows.length, [rows]);

  const handleDownloadExcel = () => {
    if (!project) return;

    const styles = {
      title: {
        font: { bold: true, sz: 14, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "D9EAF7" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
      projectHeader: {
        font: { bold: true, color: { rgb: "0C4A6E" } },
        fill: { fgColor: { rgb: "D9F2FF" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
      zone1Header: {
        font: { bold: true, color: { rgb: "365314" } },
        fill: { fgColor: { rgb: "D9F0C1" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      },
      zone2Header: {
        font: { bold: true, color: { rgb: "92400E" } },
        fill: { fgColor: { rgb: "FFF3B0" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      },
      zone2LinkHeader: {
        font: { bold: true, color: { rgb: "92400E" } },
        fill: { fgColor: { rgb: "F6C453" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      },
      zone3Header: {
        font: { bold: true, color: { rgb: "1E3A8A" } },
        fill: { fgColor: { rgb: "DDD6FE" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      },
      subHeader: {
        font: { bold: true, color: { rgb: "111827" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { horizontal: "center", vertical: "center" },
      },
      body: {
        alignment: { vertical: "top", wrapText: true },
      },
    };

    const headerRows = [
      ["WAGON DATA SHEET - PROJECT DETAIL"],
      [],
      ["Project Name", safeText(project.projectName), "Contract / P.O. No.", safeText(project.contractPoNumber)],
      ["P.O. Date", safeText(project.contractPoDate), "D.P. Upto", safeText(project.deliveryPeriodUpto)],
      ["Total Quantity", safeText(project.totalQuantity), "Contract Placed By", safeText(project.contractPlacedBy)],
      ["Wagon Manufacturer", safeText(project.wagonManufacturer), "Wagon Type in P.O.", safeText(project.wagonTypeInPo)],
      ["Type Offered", safeText(project.wagonTypeOffered), "Rows", rows.length],
      ["Offered For Inspection", safeText(project.wagonsOfferedForInspection), "Inspection Offer Date", safeText(project.inspectionOfferDate)],
      ["Notes", safeText(project.notes)],
      [],
    ];

    const tableHeader = [[
      "SL.NO",
      "TEX NO.",
      "WAGON NO.",
      "CONFIGURATION",
      "BOGIE MAKE",
      "BOGIE SL. NO.",
      "COUPLER MAKE",
      "COUPLER SL. NO.",
      "DRAFT GEAR MAKE",
      "DRAFT GEAR SL. NO.",
      "DV MAKE",
      "DV SL. NO.",
      "BC MAKE",
      "BC SL. NO.",
      "AR MAKE",
      "AR SL. NO.",
      "SAB MAKE",
      "ATL MAKE",
      "CRF MAKE",
      "BOGIE / WHEEL DATA LINK",
      "AXLE MAKE",
      "AXLE SL. NO.",
      "WHEEL MAKE",
      "WHEEL SL. NO.",
      "BEARING MAKE",
      "BEARING SL. NO.",
      "TARE WEIGHT",
      "MFG. DATE",
      "TXR FIT DATE",
      "RFID NO.",
      "DM NO.",
      "DM DATE",
      "ROH DATE",
      "RETURN / POH DATE",
    ]];

    const tableRows = rows.map((row, idx) => [
      row.slNo || idx + 1,
      safeText(row.texNo),
      safeText(row.wagonNo),
      safeText(row.wagonConfiguration),
      safeText(row.firstZone?.bogie?.make),
      safeBogieSerialSummary(row),
      safeText(row.firstZone?.coupler?.make),
      safeJoinSerials(row.firstZone?.coupler?.serialNumbers),
      safeText(row.firstZone?.draftGear?.make),
      safeJoinSerials(row.firstZone?.draftGear?.serialNumbers),
      safeText(row.firstZone?.dv?.make),
      safeJoinSerials(row.firstZone?.dv?.serialNumbers),
      safeText(row.firstZone?.bc?.make),
      safeJoinSerials(row.firstZone?.bc?.serialNumbers),
      safeText(row.firstZone?.ar?.make),
      safeJoinSerials(row.firstZone?.ar?.serialNumbers),
      safeText(row.firstZone?.sabMake),
      safeText(row.firstZone?.atlMake),
      safeText(row.firstZone?.crfMake),
      safeLinkedWheelKeyMapping(row),
      safeLinkedWheelMakes(row, "axle"),
      safeLinkedWheelSerials(row, "axle"),
      safeLinkedWheelMakes(row, "wheel"),
      safeLinkedWheelSerials(row, "wheel"),
      safeLinkedWheelMakes(row, "bearing"),
      safeLinkedWheelSerials(row, "bearing"),
      safeText(finalValue(row, "tareWeight")),
      safeText(finalValue(row, "manufactureDate")),
      safeText(finalValue(row, "txrFitDate")),
      combinedRfidNumbers(row),
      safeText(finalValue(row, "dmNo")),
      safeText(finalValue(row, "dmDate")),
      safeText(finalValue(row, "rohDate")),
      safeText(finalValue(row, "returnOrPohDate")),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...tableHeader, ...tableRows]);
    ws["!cols"] = Array.from({ length: 34 }, (_value, index) => ({ wch: index === 19 || index === 29 ? 34 : 18 }));
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    ws["!rows"] = [{ hpt: 22 }];

    applyRangeStyle(ws, 0, 0, 0, 5, styles.title);
    applyRangeStyle(ws, 2, 8, 0, 3, styles.projectHeader);

    applyRangeStyle(ws, 10, 10, 0, 3, styles.projectHeader);
    applyRangeStyle(ws, 10, 10, 4, 18, styles.zone1Header);
    applyRangeStyle(ws, 10, 10, 19, 19, styles.zone2LinkHeader);
    applyRangeStyle(ws, 10, 10, 20, 25, styles.zone2Header);
    applyRangeStyle(ws, 10, 10, 26, 33, styles.zone3Header);
    applyRangeStyle(ws, 11, 11, 4, 25, styles.subHeader);

    const dataStartRow = 12;
    const dataEndRow = dataStartRow + Math.max(tableRows.length - 1, 0);
    applyRangeStyle(ws, dataStartRow, dataEndRow, 0, 33, styles.body);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Wagon Data Sheet");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Wagon_Data_Sheet_${fileSafe(project.projectName)}.xlsx`
    );
  };

  const handleDownloadOfferWorkbook = () => {
    if (!project) {
      return;
    }

    downloadWagonOfferWorkbook(project, rows);
  };

  const handleDownloadOfferPdf = async () => {
    if (!project) {
      return;
    }

    await downloadWagonOfferPdf(project, rows);
  };

  const handleDownloadElectronicsWorkbook = () => {
    if (!project) {
      return;
    }

    downloadWagonElectronicsWorkbook(project, rows);
  };

  const handleDownloadCocWorkbook = () => {
    if (!project) {
      return;
    }

    downloadWagonCocWorkbook(project, rows);
  };

  if (role !== "admin") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">This detailed wagon data sheet view is available for admin only.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Wagon Data Sheet - Project Detail
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Full project view in Excel-style tabular format.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button variant="contained" onClick={handleDownloadExcel} disabled={!project}>
            Download Excel
          </Button>
          <Button variant="outlined" onClick={handleDownloadOfferWorkbook} disabled={!project}>
            Wagon Offer Copy.xlsx
          </Button>
          <Button variant="outlined" onClick={handleDownloadOfferPdf} disabled={!project}>
            Wagon Offer Copy.pdf
          </Button>
          <Button variant="outlined" onClick={handleDownloadElectronicsWorkbook} disabled={!project}>
            Wagon Electronics Data Sheet.xlsx
          </Button>
          <Button variant="outlined" onClick={handleDownloadCocWorkbook} disabled={!project}>
            COC OF Wagon.xlsx
          </Button>
          <Button variant="outlined" onClick={() => navigate("/quality/wagon-data-sheet/projects")}>
            Back to Projects
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

      {project ? (
        <>
          <Paper sx={{ mb: 3, p: 3, background: "#f0f9ff", border: "1px solid #7dd3fc" }}>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              <Chip label={project.projectName || "—"} sx={{ bgcolor: "#0369a1", color: "white", fontWeight: 700 }} />
              <Chip label={`P.O.: ${textOrDash(project.contractPoNumber)}`} variant="outlined" />
              <Chip label={`Type: ${textOrDash(project.wagonTypeOffered)}`} variant="outlined" />
              <Chip label={`Rows: ${offeredCount}`} variant="outlined" />
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
              <Typography variant="body2"><b>Contract / P.O. No.:</b> {textOrDash(project.contractPoNumber)}</Typography>
              <Typography variant="body2"><b>P.O. Date:</b> {textOrDash(project.contractPoDate)}</Typography>
              <Typography variant="body2"><b>D.P. Upto:</b> {textOrDash(project.deliveryPeriodUpto)}</Typography>
              <Typography variant="body2"><b>Total Quantity:</b> {textOrDash(project.totalQuantity)}</Typography>
              <Typography variant="body2"><b>Contract Placed By:</b> {textOrDash(project.contractPlacedBy)}</Typography>
              <Typography variant="body2"><b>Wagon Manufacturer:</b> {textOrDash(project.wagonManufacturer)}</Typography>
              <Typography variant="body2"><b>Wagon Type in P.O.:</b> {textOrDash(project.wagonTypeInPo)}</Typography>
              <Typography variant="body2"><b>Type Offered:</b> {textOrDash(project.wagonTypeOffered)}</Typography>
              <Typography variant="body2"><b>Offered For Inspection:</b> {textOrDash(project.wagonsOfferedForInspection)}</Typography>
              <Typography variant="body2"><b>Inspection Offer Date:</b> {textOrDash(project.inspectionOfferDate)}</Typography>
              <Typography variant="body2"><b>Notes:</b> {textOrDash(project.notes)}</Typography>
            </Box>
          </Paper>

          <TableContainer component={Paper} sx={{ border: "1px solid #cbd5e1" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ "& th": { background: "#d9f2ff" } }}>
                  <HeaderCell rowSpan={2}>SL.NO</HeaderCell>
                  <HeaderCell rowSpan={2}>INSPECTOR NAME</HeaderCell>
                  <HeaderCell rowSpan={2}>DATE &amp; TIME</HeaderCell>
                  <HeaderCell rowSpan={2}>TEX NO.</HeaderCell>
                  <HeaderCell rowSpan={2}>WAGON NO.</HeaderCell>
                  <HeaderCell rowSpan={2}>CONFIGURATION</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>BOGIE</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>COUPLER</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>DRAFT GEAR</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>DV</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>BC</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>AR</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ background: "#d9f0c1" }}>SAB MAKE</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ background: "#d9f0c1" }}>ATL MAKE</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ background: "#d9f0c1" }}>CRF MAKE</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ background: "#f6c453" }}>Bogie / Wheel Data Link</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#fff3b0", textAlign: "center" }}>AXLE NO.</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#fff3b0", textAlign: "center" }}>WHEEL NO.</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#fff3b0", textAlign: "center" }}>BEARING NO.</HeaderCell>
                  <HeaderCell rowSpan={2}>TARE WEIGHT</HeaderCell>
                  <HeaderCell rowSpan={2}>MFG. DATE</HeaderCell>
                  <HeaderCell rowSpan={2}>TXR FIT DATE</HeaderCell>
                  <HeaderCell rowSpan={2}>RFID NO.</HeaderCell>
                  <HeaderCell rowSpan={2}>DM NO.</HeaderCell>
                  <HeaderCell rowSpan={2}>DM DATE</HeaderCell>
                  <HeaderCell rowSpan={2}>ROH DATE</HeaderCell>
                  <HeaderCell rowSpan={2}>RETURN / POH DATE</HeaderCell>
                </TableRow>
                <TableRow sx={{ "& th": { background: "#f8fafc" } }}>
                  {["BOGIE", "COUPLER", "DRAFT", "DV", "BC", "AR", "AXLE", "WHEEL", "BEARING"].flatMap((key, index) => [
                    <HeaderCell key={`${key}-make-${index}`}>MAKE</HeaderCell>,
                    <HeaderCell key={`${key}-sl-${index}`}>SL. NO.</HeaderCell>,
                  ])}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.slNo || idx + 1}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.submittedBy?.username)}</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>{formatDateTime(row.firstZone?.submittedAt)}</TableCell>
                    <TableCell>{textOrDash(row.texNo)}</TableCell>
                    <TableCell>{textOrDash(row.wagonNo)}</TableCell>
                    <TableCell>{textOrDash(row.wagonConfiguration)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.bogie?.make)}</TableCell>
                    <TableCell>{bogieSerialSummary(row)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.coupler?.make)}</TableCell>
                    <TableCell>{joinSerials(row.firstZone?.coupler?.serialNumbers)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.draftGear?.make)}</TableCell>
                    <TableCell>{joinSerials(row.firstZone?.draftGear?.serialNumbers)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.dv?.make)}</TableCell>
                    <TableCell>{joinSerials(row.firstZone?.dv?.serialNumbers)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.bc?.make)}</TableCell>
                    <TableCell>{joinSerials(row.firstZone?.bc?.serialNumbers)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.ar?.make)}</TableCell>
                    <TableCell>{joinSerials(row.firstZone?.ar?.serialNumbers)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.sabMake)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.atlMake)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.crfMake)}</TableCell>
                    <TableCell sx={{ whiteSpace: "pre-line", minWidth: 260 }}>{linkedWheelKeyMapping(row)}</TableCell>
                    <TableCell>{linkedWheelMakes(row, "axle")}</TableCell>
                    <TableCell>{linkedWheelSerials(row, "axle")}</TableCell>
                    <TableCell>{linkedWheelMakes(row, "wheel")}</TableCell>
                    <TableCell>{linkedWheelSerials(row, "wheel")}</TableCell>
                    <TableCell>{linkedWheelMakes(row, "bearing")}</TableCell>
                    <TableCell>{linkedWheelSerials(row, "bearing")}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "tareWeight"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "manufactureDate"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "txrFitDate"))}</TableCell>
                    <TableCell sx={{ whiteSpace: "pre-line", minWidth: 180 }}>{combinedRfidNumbers(row)}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "dmNo"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "dmDate"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "rohDate"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "returnOrPohDate"))}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={36} align="center">
                      No wagon rows added yet for this project.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : null}
    </Box>
  );
}
