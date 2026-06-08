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

const joinSerials = (value) => (Array.isArray(value) && value.length ? value.join(", ") : "—");
const textOrDash = (value) => (value ? String(value) : "—");
const finalValue = (row, key) => row?.finalAssembly?.[key] || row?.secondZone?.[key] || "";
const fileSafe = (value) => String(value || "project").replace(/[\\/:*?"<>|]+/g, "_");

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
      ["Project Name", textOrDash(project.projectName), "Contract / P.O. No.", textOrDash(project.contractPoNumber)],
      ["P.O. Date", textOrDash(project.contractPoDate), "D.P. Upto", textOrDash(project.deliveryPeriodUpto)],
      ["Total Quantity", textOrDash(project.totalQuantity), "Contract Placed By", textOrDash(project.contractPlacedBy)],
      ["Wagon Manufacturer", textOrDash(project.wagonManufacturer), "Wagon Type in P.O.", textOrDash(project.wagonTypeInPo)],
      ["Type Offered", textOrDash(project.wagonTypeOffered), "Configuration", textOrDash(project.wagonConfiguration)],
      ["Offered For Inspection", textOrDash(project.wagonsOfferedForInspection), "Inspection Offer Date", textOrDash(project.inspectionOfferDate)],
      ["Notes", textOrDash(project.notes)],
      [],
    ];

    const tableHeader = [[
      "SL.NO",
      "TEX NO.",
      "WAGON NO.",
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
      "WHEEL DATA",
      "AXLE MAKE",
      "AXLE SL. NO.",
      "WHEEL MAKE",
      "WHEEL SL. NO.",
      "BEARING MAKE",
      "BEARING SL. NO.",
      "TARE WEIGHT",
      "TXR FIT DATE",
      "MFG. DATE",
      "RFID NO.",
      "DM NO & DATE",
      "ROH DATE",
      "RETURN / POH DATE",
    ]];

    const tableRows = rows.map((row, idx) => [
      row.slNo || idx + 1,
      textOrDash(row.texNo),
      textOrDash(row.wagonNo),
      textOrDash(row.firstZone?.bogie?.make),
      joinSerials(row.firstZone?.bogie?.serialNumbers),
      textOrDash(row.firstZone?.coupler?.make),
      joinSerials(row.firstZone?.coupler?.serialNumbers),
      textOrDash(row.firstZone?.draftGear?.make),
      joinSerials(row.firstZone?.draftGear?.serialNumbers),
      textOrDash(row.firstZone?.dv?.make),
      joinSerials(row.firstZone?.dv?.serialNumbers),
      textOrDash(row.firstZone?.bc?.make),
      joinSerials(row.firstZone?.bc?.serialNumbers),
      textOrDash(row.firstZone?.ar?.make),
      joinSerials(row.firstZone?.ar?.serialNumbers),
      textOrDash(row.firstZone?.sabMake),
      textOrDash(row.firstZone?.atlMake),
      textOrDash(row.firstZone?.crfMake),
      textOrDash(row.wheelDataKey),
      textOrDash(row.secondZone?.axle?.make),
      joinSerials(row.secondZone?.axle?.serialNumbers),
      textOrDash(row.secondZone?.wheel?.make),
      joinSerials(row.secondZone?.wheel?.serialNumbers),
      textOrDash(row.secondZone?.bearing?.make),
      joinSerials(row.secondZone?.bearing?.serialNumbers),
      textOrDash(finalValue(row, "tareWeight")),
      textOrDash(finalValue(row, "txrFitDate")),
      textOrDash(finalValue(row, "manufactureDate")),
      textOrDash(finalValue(row, "rfidNo")),
      textOrDash(finalValue(row, "dmNoAndDate")),
      textOrDash(finalValue(row, "rohDate")),
      textOrDash(finalValue(row, "returnOrPohDate")),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...tableHeader, ...tableRows]);
    ws["!cols"] = new Array(32).fill({ wch: 18 });
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    ws["!rows"] = [{ hpt: 22 }];

    applyRangeStyle(ws, 0, 0, 0, 5, styles.title);
    applyRangeStyle(ws, 2, 8, 0, 3, styles.projectHeader);

    applyRangeStyle(ws, 10, 10, 0, 2, styles.projectHeader);
    applyRangeStyle(ws, 10, 10, 3, 17, styles.zone1Header);
    applyRangeStyle(ws, 10, 10, 18, 18, styles.zone2LinkHeader);
    applyRangeStyle(ws, 10, 10, 19, 24, styles.zone2Header);
    applyRangeStyle(ws, 10, 10, 25, 31, styles.zone3Header);
    applyRangeStyle(ws, 11, 11, 3, 24, styles.subHeader);

    const dataStartRow = 12;
    const dataEndRow = dataStartRow + Math.max(tableRows.length - 1, 0);
    applyRangeStyle(ws, dataStartRow, dataEndRow, 0, 31, styles.body);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Wagon Data Sheet");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Wagon_Data_Sheet_${fileSafe(project.projectName)}.xlsx`
    );
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
              <Typography variant="body2"><b>Configuration:</b> {textOrDash(project.wagonConfiguration)}</Typography>
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
                  <HeaderCell rowSpan={2}>TEX NO.</HeaderCell>
                  <HeaderCell rowSpan={2}>WAGON NO.</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>BOGIE</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>COUPLER</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>DRAFT GEAR</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>DV</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>BC</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#d9f0c1", textAlign: "center" }}>AR</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ background: "#d9f0c1" }}>SAB MAKE</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ background: "#d9f0c1" }}>ATL MAKE</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ background: "#d9f0c1" }}>CRF MAKE</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ background: "#f6c453" }}>Wheel Data</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#fff3b0", textAlign: "center" }}>AXLE NO.</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#fff3b0", textAlign: "center" }}>WHEEL NO.</HeaderCell>
                  <HeaderCell colSpan={2} sx={{ background: "#fff3b0", textAlign: "center" }}>BEARING NO.</HeaderCell>
                  <HeaderCell rowSpan={2}>TARE WEIGHT</HeaderCell>
                  <HeaderCell rowSpan={2}>TXR FIT DATE</HeaderCell>
                  <HeaderCell rowSpan={2}>MFG. DATE</HeaderCell>
                  <HeaderCell rowSpan={2}>RFID NO.</HeaderCell>
                  <HeaderCell rowSpan={2}>DM NO & DATE</HeaderCell>
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
                    <TableCell>{textOrDash(row.texNo)}</TableCell>
                    <TableCell>{textOrDash(row.wagonNo)}</TableCell>
                    <TableCell>{textOrDash(row.firstZone?.bogie?.make)}</TableCell>
                    <TableCell>{joinSerials(row.firstZone?.bogie?.serialNumbers)}</TableCell>
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
                    <TableCell>{textOrDash(row.wheelDataKey)}</TableCell>
                    <TableCell>{textOrDash(row.secondZone?.axle?.make)}</TableCell>
                    <TableCell>{joinSerials(row.secondZone?.axle?.serialNumbers)}</TableCell>
                    <TableCell>{textOrDash(row.secondZone?.wheel?.make)}</TableCell>
                    <TableCell>{joinSerials(row.secondZone?.wheel?.serialNumbers)}</TableCell>
                    <TableCell>{textOrDash(row.secondZone?.bearing?.make)}</TableCell>
                    <TableCell>{joinSerials(row.secondZone?.bearing?.serialNumbers)}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "tareWeight"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "txrFitDate"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "manufactureDate"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "rfidNo"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "dmNoAndDate"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "rohDate"))}</TableCell>
                    <TableCell>{textOrDash(finalValue(row, "returnOrPohDate"))}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={32} align="center">
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
