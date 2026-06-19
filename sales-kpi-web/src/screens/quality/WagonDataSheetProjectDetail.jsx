import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
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
    `B1 [${bogie1SerialNumber}]: ${bogie1Links.length ? bogie1Links.join(", ") : "—"}`,
    `B2 [${bogie2SerialNumber}]: ${bogie2Links.length ? bogie2Links.join(", ") : "—"}`,
  ].join("\n");
};
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
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
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

// ── Zone colour tokens (consistent with InspectorHistory page) ──────────────
const ZC = {
  info:  { bg: "#dbeafe", sub: "#eff6ff",  text: "#1e40af",  border: "#bfdbfe" },
  zone2: { bg: "#fef9c3", sub: "#fffbeb",  text: "#92400e",  border: "#fcd34d" },
  link:  { bg: "#fde68a", sub: "#fef9c3",  text: "#78350f",  border: "#fbbf24" },
  zone1: { bg: "#dcfce7", sub: "#f0fdf4",  text: "#166534",  border: "#86efac" },
  zone3: { bg: "#ede9fe", sub: "#f5f3ff",  text: "#4338ca",  border: "#c4b5fd" },
};

function ZoneHeaderCell({ children, colSpan, zone }) {
  const c = ZC[zone];
  return (
    <TableCell
      colSpan={colSpan}
      align="center"
      sx={{
        bgcolor: c.bg,
        color: c.text,
        fontWeight: 800,
        fontSize: "0.68rem",
        textTransform: "uppercase",
        letterSpacing: 0.9,
        borderBottom: `1.5px solid ${c.border}`,
        py: 0.75,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </TableCell>
  );
}

function HeaderCell({ children, colSpan, rowSpan, zone }) {
  const c = ZC[zone];
  return (
    <TableCell
      colSpan={colSpan}
      rowSpan={rowSpan}
      align="center"
      sx={{
        bgcolor: c.sub,
        color: c.text,
        fontWeight: 700,
        fontSize: "0.68rem",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
        borderColor: c.border,
        py: 0.75,
        px: 1,
      }}
    >
      {children}
    </TableCell>
  );
}

function SubHeaderCell({ children, zone }) {
  const c = ZC[zone];
  return (
    <TableCell
      align="center"
      sx={{
        bgcolor: c.sub,
        color: c.text,
        fontWeight: 600,
        fontSize: "0.65rem",
        textTransform: "uppercase",
        letterSpacing: 0.3,
        borderColor: c.border,
        py: 0.5,
        px: 0.75,
        opacity: 0.9,
      }}
    >
      {children}
    </TableCell>
  );
}

function DataCell({ children, sx = {} }) {
  return (
    <TableCell
      sx={{
        fontSize: "0.8rem",
        py: 0.75,
        px: 1,
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {children}
    </TableCell>
  );
}

function InfoField({ label, value }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
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
      "SL.NO", "TEX NO.", "WAGON NO.", "CONFIGURATION",
      "BOGIE MAKE", "BOGIE SL. NO.",
      "COUPLER MAKE", "COUPLER SL. NO.",
      "DRAFT GEAR MAKE", "DRAFT GEAR SL. NO.",
      "DV MAKE", "DV SL. NO.",
      "BC MAKE", "BC SL. NO.",
      "AR MAKE", "AR SL. NO.",
      "SAB MAKE", "ATL MAKE", "CRF MAKE",
      "BOGIE / WHEEL DATA LINK",
      "AXLE MAKE", "AXLE SL. NO.",
      "WHEEL MAKE", "WHEEL SL. NO.",
      "BEARING MAKE", "BEARING SL. NO.",
      "TARE WEIGHT", "MFG. DATE", "TXR FIT DATE", "RFID NO.",
      "DM NO.", "DM DATE", "ROH DATE", "RETURN / POH DATE",
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

  const handleDownloadOfferWorkbook = () => { if (project) downloadWagonOfferWorkbook(project, rows); };
  const handleDownloadOfferPdf = async () => { if (project) await downloadWagonOfferPdf(project, rows); };
  const handleDownloadElectronicsWorkbook = () => { if (project) downloadWagonElectronicsWorkbook(project, rows); };
  const handleDownloadCocWorkbook = () => { if (project) downloadWagonCocWorkbook(project, rows); };

  if (role !== "admin") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">This detailed wagon data sheet view is available for admin only.</Alert>
      </Box>
    );
  }

  const reportButtons = [
    { label: "Offer .xlsx",    full: "Wagon Offer Copy.xlsx",              handler: handleDownloadOfferWorkbook },
    { label: "Offer .pdf",     full: "Wagon Offer Copy.pdf",               handler: handleDownloadOfferPdf },
    { label: "Electronics",   full: "Wagon Electronics Data Sheet.xlsx",  handler: handleDownloadElectronicsWorkbook },
    { label: "COC",            full: "COC OF Wagon.xlsx",                  handler: handleDownloadCocWorkbook },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1500, mx: "auto" }}>

      {/* ── Page Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: "#0369a1",
              borderRadius: 2,
              p: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>📋</Typography>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
              Project Detail
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
              Wagon Data Sheet — Full Table View
            </Typography>
          </Box>
        </Box>
        <Button
          onClick={() => navigate("/quality/wagon-data-sheet/projects")}
          sx={{ color: "#0369a1", fontWeight: 700, fontSize: "0.85rem", textTransform: "none", px: 0 }}
        >
          ← Back to Projects
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* ── Download Toolbar ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2.5,
          border: "1.5px solid #bfdbfe",
          bgcolor: "#eff6ff",
          px: { xs: 2, md: 2.5 },
          py: 1.25,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Button
          onClick={handleDownloadExcel}
          disabled={!project}
          variant="contained"
          sx={{
            bgcolor: "#1d4ed8",
            "&:hover": { bgcolor: "#1e40af" },
            fontWeight: 700,
            borderRadius: 1.5,
            textTransform: "none",
            px: 2.5,
            py: 0.9,
            fontSize: "0.85rem",
            boxShadow: "0 3px 10px rgba(29,78,216,0.35)",
          }}
        >
          ⬇ Download Full Table
        </Button>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Typography variant="caption" color="#475569" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          Reports:
        </Typography>

        {reportButtons.map(({ label, full, handler }) => (
          <Tooltip key={label} title={full} enterTouchDelay={400}>
            <span>
              <Button
                onClick={handler}
                disabled={!project}
                variant="outlined"
                sx={{
                  borderColor: "#93c5fd",
                  color: "#1d4ed8",
                  fontWeight: 600,
                  borderRadius: 1.5,
                  textTransform: "none",
                  px: 1.75,
                  py: 0.65,
                  fontSize: "0.82rem",
                  "&:hover": { borderColor: "#1d4ed8", bgcolor: "#dbeafe" },
                  "&:disabled": { borderColor: "#e2e8f0", color: "#94a3b8" },
                }}
              >
                {label}
              </Button>
            </span>
          </Tooltip>
        ))}
      </Paper>

      {project && (
        <>
          {/* ── Project Info Card ── */}
          <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #7dd3fc", overflow: "hidden" }}>
            <Box
              sx={{
                px: { xs: 2.5, md: 3 },
                py: 1.5,
                bgcolor: "#0369a1",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography fontWeight={800} fontSize="1rem" color="white" sx={{ letterSpacing: -0.3 }}>
                {project.projectName || "—"}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip
                  label={`P.O.: ${textOrDash(project.contractPoNumber)}`}
                  size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "white", fontWeight: 600, fontSize: "0.75rem" }}
                />
                <Chip
                  label={`${offeredCount} ${offeredCount === 1 ? "Entry" : "Entries"}`}
                  size="small"
                  sx={{ bgcolor: "#fde047", color: "#78350f", fontWeight: 800, fontSize: "0.75rem" }}
                />
              </Stack>
            </Box>

            <Box
              sx={{
                p: { xs: 2.5, md: 3 },
                bgcolor: "#f0f9ff",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                gap: 2.5,
              }}
            >
              <InfoField label="Contract / P.O. No." value={textOrDash(project.contractPoNumber)} />
              <InfoField label="P.O. Date" value={textOrDash(project.contractPoDate)} />
              <InfoField label="D.P. Upto" value={textOrDash(project.deliveryPeriodUpto)} />
              <InfoField label="Total Quantity" value={textOrDash(project.totalQuantity)} />
              <InfoField label="Contract Placed By" value={textOrDash(project.contractPlacedBy)} />
              <InfoField label="Wagon Manufacturer" value={textOrDash(project.wagonManufacturer)} />
              <InfoField label="Wagon Type in P.O." value={textOrDash(project.wagonTypeInPo)} />
              <InfoField label="Type Offered" value={textOrDash(project.wagonTypeOffered)} />
              <InfoField label="Offered For Inspection" value={textOrDash(project.wagonsOfferedForInspection)} />
              <InfoField label="Inspection Offer Date" value={textOrDash(project.inspectionOfferDate)} />
            </Box>

            {project.notes && (
              <>
                <Divider />
                <Box sx={{ px: { xs: 2.5, md: 3 }, py: 2, bgcolor: "#f0f9ff" }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 0.5 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" color="text.primary">{project.notes}</Typography>
                </Box>
              </>
            )}
          </Paper>

          {/* ── Data Table ── */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
            <Box
              sx={{
                px: { xs: 2, md: 3 },
                py: 1.25,
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b">
                Wagon Entries
              </Typography>
              <Chip
                size="small"
                label={rows.length}
                sx={{ bgcolor: "#0369a1", color: "white", fontWeight: 700, height: 20, fontSize: "0.72rem" }}
              />
              {rows.length === 0 && (
                <Typography variant="caption" color="text.secondary">No entries have been added yet.</Typography>
              )}
            </Box>

            <TableContainer sx={{ maxHeight: "62vh" }}>
              <Table size="small" stickyHeader>
                <TableHead>

                  {/* ── Row 0: Zone group labels ── */}
                  <TableRow>
                    <ZoneHeaderCell colSpan={6}  zone="info">General Information</ZoneHeaderCell>
                    <ZoneHeaderCell colSpan={15} zone="zone2">2nd Zone — Bogie &amp; Components</ZoneHeaderCell>
                    <ZoneHeaderCell colSpan={1}  zone="link">Wheel Data Link</ZoneHeaderCell>
                    <ZoneHeaderCell colSpan={6}  zone="zone1">1st Zone — Wheel Set</ZoneHeaderCell>
                    <ZoneHeaderCell colSpan={8}  zone="zone3">3rd Zone — Final Assembly</ZoneHeaderCell>
                  </TableRow>

                  {/* ── Row 1: Column group names ── */}
                  <TableRow>
                    <HeaderCell rowSpan={2} zone="info">SL.NO</HeaderCell>
                    <HeaderCell rowSpan={2} zone="info">Inspector</HeaderCell>
                    <HeaderCell rowSpan={2} zone="info">Date &amp; Time</HeaderCell>
                    <HeaderCell rowSpan={2} zone="info">TEX No.</HeaderCell>
                    <HeaderCell rowSpan={2} zone="info">Wagon No.</HeaderCell>
                    <HeaderCell rowSpan={2} zone="info">Config.</HeaderCell>

                    <HeaderCell colSpan={2}  zone="zone2">Bogie</HeaderCell>
                    <HeaderCell colSpan={2}  zone="zone2">Coupler</HeaderCell>
                    <HeaderCell colSpan={2}  zone="zone2">Draft Gear</HeaderCell>
                    <HeaderCell colSpan={2}  zone="zone2">DV</HeaderCell>
                    <HeaderCell colSpan={2}  zone="zone2">BC</HeaderCell>
                    <HeaderCell colSpan={2}  zone="zone2">AR</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone2">SAB</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone2">ATL</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone2">CRF</HeaderCell>

                    <HeaderCell rowSpan={2} zone="link">B1 / B2 → Key</HeaderCell>

                    <HeaderCell colSpan={2} zone="zone1">Axle</HeaderCell>
                    <HeaderCell colSpan={2} zone="zone1">Wheel</HeaderCell>
                    <HeaderCell colSpan={2} zone="zone1">Bearing</HeaderCell>

                    <HeaderCell rowSpan={2} zone="zone3">Tare Wt.</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone3">Mfg. Date</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone3">TXR Fit</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone3">RFID No.</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone3">DM No.</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone3">DM Date</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone3">ROH Date</HeaderCell>
                    <HeaderCell rowSpan={2} zone="zone3">POH Date</HeaderCell>
                  </TableRow>

                  {/* ── Row 2: Make / Sl. No. sub-headers ── */}
                  <TableRow>
                    {["zone2", "zone2", "zone2", "zone2", "zone2", "zone2"].flatMap((zone, i) => [
                      <SubHeaderCell key={`2z-mk-${i}`} zone={zone}>Make</SubHeaderCell>,
                      <SubHeaderCell key={`2z-sl-${i}`} zone={zone}>Sl. No.</SubHeaderCell>,
                    ])}
                    {["zone1", "zone1", "zone1"].flatMap((zone, i) => [
                      <SubHeaderCell key={`1z-mk-${i}`} zone={zone}>Make</SubHeaderCell>,
                      <SubHeaderCell key={`1z-sl-${i}`} zone={zone}>Sl. No.</SubHeaderCell>,
                    ])}
                  </TableRow>

                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={36} align="center" sx={{ py: 6, color: "text.secondary", fontSize: "0.88rem" }}>
                        No wagon entries have been added yet for this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => (
                      <TableRow
                        key={row._id}
                        sx={{
                          bgcolor: idx % 2 === 0 ? "white" : "#f8fafc",
                          "&:hover": { bgcolor: "#f0f9ff" },
                        }}
                      >
                        <DataCell>{row.slNo || idx + 1}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.submittedBy?.username)}</DataCell>
                        <DataCell sx={{ minWidth: 140 }}>{formatDateTime(row.firstZone?.submittedAt)}</DataCell>
                        <DataCell>{textOrDash(row.texNo)}</DataCell>
                        <DataCell>{textOrDash(row.wagonNo)}</DataCell>
                        <DataCell>{textOrDash(row.wagonConfiguration)}</DataCell>

                        <DataCell>{textOrDash(row.firstZone?.bogie?.make)}</DataCell>
                        <DataCell>{bogieSerialSummary(row)}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.coupler?.make)}</DataCell>
                        <DataCell>{joinSerials(row.firstZone?.coupler?.serialNumbers)}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.draftGear?.make)}</DataCell>
                        <DataCell>{joinSerials(row.firstZone?.draftGear?.serialNumbers)}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.dv?.make)}</DataCell>
                        <DataCell>{joinSerials(row.firstZone?.dv?.serialNumbers)}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.bc?.make)}</DataCell>
                        <DataCell>{joinSerials(row.firstZone?.bc?.serialNumbers)}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.ar?.make)}</DataCell>
                        <DataCell>{joinSerials(row.firstZone?.ar?.serialNumbers)}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.sabMake)}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.atlMake)}</DataCell>
                        <DataCell>{textOrDash(row.firstZone?.crfMake)}</DataCell>

                        <DataCell sx={{ whiteSpace: "pre-line", minWidth: 220 }}>{linkedWheelKeyMapping(row)}</DataCell>

                        <DataCell>{linkedWheelMakes(row, "axle")}</DataCell>
                        <DataCell>{linkedWheelSerials(row, "axle")}</DataCell>
                        <DataCell>{linkedWheelMakes(row, "wheel")}</DataCell>
                        <DataCell>{linkedWheelSerials(row, "wheel")}</DataCell>
                        <DataCell>{linkedWheelMakes(row, "bearing")}</DataCell>
                        <DataCell>{linkedWheelSerials(row, "bearing")}</DataCell>

                        <DataCell>{textOrDash(finalValue(row, "tareWeight"))}</DataCell>
                        <DataCell>{textOrDash(finalValue(row, "manufactureDate"))}</DataCell>
                        <DataCell>{textOrDash(finalValue(row, "txrFitDate"))}</DataCell>
                        <DataCell sx={{ whiteSpace: "pre-line", minWidth: 160 }}>{combinedRfidNumbers(row)}</DataCell>
                        <DataCell>{textOrDash(finalValue(row, "dmNo"))}</DataCell>
                        <DataCell>{textOrDash(finalValue(row, "dmDate"))}</DataCell>
                        <DataCell>{textOrDash(finalValue(row, "rohDate"))}</DataCell>
                        <DataCell>{textOrDash(finalValue(row, "returnOrPohDate"))}</DataCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
