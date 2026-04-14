import React, { useEffect, useRef, useState } from "react";
import api from "../../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  TextField,
  Button,
  Chip,
  Divider,
} from "@mui/material";

/* -----------------------------------------------------------
   ✅ Bogie Inspection Report Dashboard
----------------------------------------------------------- */
export default function BogieInspectionReport() {
  const [data, setData] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const pdfRef = useRef(null);
  const detailPdfRef = useRef(null);
  const [afterReport, setAfterReport] = useState(null);
const [afterOpen, setAfterOpen] = useState(false);
const [editMode, setEditMode] = useState(false);
const [editForm, setEditForm] = useState({});



  useEffect(() => {
    fetchData();
  }, []);

  /* -----------------------------------------------------------
     ✅ Fetch Data
  ----------------------------------------------------------- */
  const fetchData = async (filter = false) => {
    try {
      let url = "/bogie-inspections";
      if (filter && fromDate && toDate) url += `?from=${fromDate}&to=${toDate}`;
      const res = await api.get(url);
      const sorted = (res.data.data || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setData(sorted);
    } catch (err) {
      console.error("❌ Error loading report:", err);
    }
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    fetchData(false);
  };
 
  const fetchAfterWheelingReport = async (bogieNo) => {
  try {
    const { data } = await api.get(`/bogie-inspections/after-wheeling/${bogieNo}`);
    setAfterReport(data?.data || null);
  } catch (err) {
    console.error("❌ Error fetching after-wheeling report:", err);
    setAfterReport(null);
  }
};

  /* -----------------------------------------------------------
     ✅ Helpers
  ----------------------------------------------------------- */
  const formatDateTime = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return `${d.toLocaleDateString("en-GB")} | ${d
      .toLocaleTimeString("en-GB")
      .replace(/:\d+ /, " ")}`;
  };

  // ✅ Works for both old local files & new Cloudinary uploads
const getImageUrl = (filename) => {
  if (!filename) return null;
  // Already a Cloudinary/external URL
  if (filename.startsWith("http")) return filename;
  // Fallback for older local uploads
  return `${import.meta.env.VITE_API_BASE_URL}/uploads/bogie-inspections/${filename}`;
};


  const renderCheck = (obj) => {
    if (!obj) return "Pending";
    const val = obj.check;
    if (val === 1) return "OK";
    if (val === -1) return "NOT OK";
    return "Pending";
  };

  const renderCheckChip = (obj) => {
    if (!obj) return <Chip label="Pending" color="warning" size="small" />;
    const val = obj.check;
    if (val === 1) return <Chip label="OK" color="success" size="small" />;
    if (val === -1) return <Chip label="NOT OK" color="error" size="small" />;
    return <Chip label="Pending" color="warning" size="small" />;
  };

  const renderVisualList = (visual = {}) => {
    if (!visual) return "-";
    const selected = Object.keys(visual).filter((k) => visual[k]);
    if (!selected.length) return "-";
    return selected.map((v) => (
      <Chip
        key={v}
        label={v.toUpperCase()}
        size="small"
        sx={{ mr: 0.5, mb: 0.5, background: "#ffe6e6" }}
      />
    ));
  };

  const PhotoThumb = ({ file }) => {
    const src = getImageUrl(file, true);
    if (!src) return <em>-</em>;
    return (
      <img
        src={src}
        alt="photo"
        crossOrigin="anonymous"
        style={{
          width: 64,
          height: 44,
          objectFit: "cover",
          borderRadius: 4,
          border: "1px solid #ddd",
          cursor: "pointer",
          display: "block",
        }}
        onClick={() => setSelectedImage(src)}
      />
    );
  };

  /* -----------------------------------------------------------
     ✅ Excel Export
  ----------------------------------------------------------- */
  const handleExportExcel = () => {
    if (!data.length) return alert("No data to export!");
    const excelData = data.map((row, i) => ({
      SL: i + 1,
      "Date & Time": formatDateTime(row.createdAt),
      "Type of Wagon": row.wagonType,
      "Bogie No": row.bogieNo,
      "Bogie Make": row.bogieMake,
      "Bogie Type": row.bogieType,
      "Wheel Base": renderCheck(row.wheelBase),
      "Bogie Diagonal": renderCheck(row.bogieDiagonal),
      "Journal Centre": renderCheck(row.bogieJournalCentre),
      "Side Frame Jaw": renderCheck(row.sideFrameJaw),
      "Brake Beam Pocket": row.brakeBeamPocket?.value || "-",
      "Side Bearer Centre": row.sideBearerCentre?.value || "-",
      "Push Rod": renderCheck(row.pushRodCheck),
      "End Pull Rod": renderCheck(row.endPullRodCheck),
      "Brake Shoe Type": row.brakeShoeType,
      "Brake Shoe": renderCheck(row.brakeShoeCheck),
      "Spring Visual": renderCheck(row.springVisualCheck),
      "Adopter Type": row.adopterType,
      Remarks: row.remarks || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bogie Inspections");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `Bogie_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  /* -----------------------------------------------------------
     ✅ PDF Export
  ----------------------------------------------------------- */
  
const handleExportPDF = async () => {
  const root = pdfRef.current;
  if (!root) return;

  // ✅ Temporarily apply capture styles
  root.classList.add("pdf-capture");
  const originalWidth = root.style.width;
  const originalOverflow = root.style.overflow;

  // ✅ Expand table fully for capture
  root.style.width = "2100px";
  root.style.overflow = "visible";

  // ✅ Capture full scrollable content
  const canvas = await html2canvas(root, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: root.scrollWidth,
    windowHeight: root.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");

  // ✅ Create PDF in landscape mode
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // ✅ Scale image to fit width
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // ✅ Add multiple pages if needed
  while (heightLeft > 0) {
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    position -= pdfHeight;
    if (heightLeft > 0) pdf.addPage();
  }

  // ✅ Restore original styles
  root.style.width = originalWidth;
  root.style.overflow = originalOverflow;
  root.classList.remove("pdf-capture");

  // ✅ Save file
  pdf.save(
    `Bogie_Inspection_Report_Agarpara_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
  );
};
// -----------------------------------------------------------
// ✅ Export individual bogie details from popup
// -----------------------------------------------------------
const handleExportDetailPDF = async () => {
  if (!detailItem || !detailPdfRef.current) return;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  /* -----------------------------------------------------------
     1️⃣ BEFORE-WHEELING INSPECTION (Full Capture Off-Screen)
  ----------------------------------------------------------- */
  const beforeSection = document.createElement("div");
  beforeSection.style.background = "#fff";
  beforeSection.style.padding = "24px";
  beforeSection.style.width = "1200px";
  beforeSection.style.position = "absolute";
  beforeSection.style.left = "-9999px";
  beforeSection.style.top = "0";
  beforeSection.style.zIndex = "-1";

  beforeSection.innerHTML = `
    <h2 style="text-align:center;margin-bottom:0;">Texmaco Rail & Engineering Ltd.</h2>
    <p style="text-align:center;margin-top:2px;">Bogie Inspection Report - Agarpara Works</p>
    <hr/>
    <h3 style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:6px;">
      BEFORE-WHEELING INSPECTION REPORT
    </h3>
    <p style="font-size:12px;text-align:center;margin-bottom:10px;">
      Bogie No: ${detailItem.bogieNo} | Date: ${new Date(detailItem.createdAt).toLocaleDateString("en-GB")}
    </p>
    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%;font-size:12px;">
      <thead>
        <tr style="background:#f3f4f6;text-align:center;">
          <th>Parameter</th>
          <th>Status</th>
          <th>Image</th>
          <th>Visual Conditions</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ["Wheel Base", detailItem.wheelBase],
          ["Bogie Diagonal", detailItem.bogieDiagonal],
          ["Journal Centre", detailItem.bogieJournalCentre],
          ["Side Frame Jaw", detailItem.sideFrameJaw],
          ["Brake Beam Pocket", detailItem.brakeBeamPocket],
          ["Side Bearer Centre", detailItem.sideBearerCentre],
          ["Push Rod", detailItem.pushRodCheck],
          ["End Pull Rod", detailItem.endPullRodCheck],
          ["Brake Shoe", detailItem.brakeShoeCheck],
          ["Spring Visual", detailItem.springVisualCheck],
        ]
          .map(
            ([label, obj]) => `
          <tr>
            <td>${label}</td>
            <td style="text-align:center;">${
              obj?.check === 1
                ? "OK"
                : obj?.check === -1
                ? "NOT OK"
                : "Pending"
            }</td>
            <td style="text-align:center;">${
              obj?.photo
                ? `<img src="${getImageUrl(obj.photo)}" width="60" height="40"/>`
                : "-"
            }</td>
            <td style="text-align:center;">${
              obj?.visual
                ? Object.keys(obj.visual)
                    .filter((v) => obj.visual[v])
                    .join(", ") || "-"
                : "-"
            }</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <p style="margin-top:10px;"><strong>Adopter Type:</strong> ${
      detailItem.adopterType || "-"
    }</p>
    <p><strong>Remarks:</strong> ${detailItem.remarks || "-"}</p>
  `;

  document.body.appendChild(beforeSection);

  const beforeCanvas = await html2canvas(beforeSection, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    windowWidth: beforeSection.scrollWidth,
    windowHeight: beforeSection.scrollHeight,
  });

  const beforeImg = beforeCanvas.toDataURL("image/png");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (beforeCanvas.height * pdfWidth) / beforeCanvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  while (heightLeft > 0) {
    pdf.addImage(beforeImg, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    position -= pdfHeight;
    if (heightLeft > 0) pdf.addPage();
  }

  document.body.removeChild(beforeSection);

  /* -----------------------------------------------------------
     2️⃣ AFTER-WHEELING VISUAL INSPECTION (if available)
  ----------------------------------------------------------- */
  if (afterReport && Object.keys(afterReport.sections || {}).length > 0) {
    const afterSection = document.createElement("div");
    afterSection.style.background = "#ffffff";
    afterSection.style.padding = "24px";
    afterSection.style.width = "1200px";
    afterSection.style.position = "absolute";
    afterSection.style.left = "-9999px";
    afterSection.style.top = "0";
    afterSection.style.zIndex = "-1";

    afterSection.innerHTML = `
      <h2 style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:8px;">
        AFTER-WHEELING VISUAL INSPECTION REPORT
      </h2>
      <p style="font-size:12px;text-align:center;margin-bottom:12px;">
        Date: ${afterReport.date ? new Date(afterReport.date).toLocaleDateString("en-GB") : "-"} |
        Inspector: ${afterReport.inspectorName || "-"}
      </p>
      ${Object.entries(afterReport.sections)
        .map(
          ([section, values]) => `
            <div style="margin-bottom:10px;padding:8px;border:1px solid #ccc;border-radius:6px;">
              <strong>${section.replace(/([A-Z])/g, " $1")}</strong><br/>
              ${
                Array.isArray(values) && values.length > 0
                  ? values
                      .map(
                        (v) =>
                          `<span style="display:inline-block;margin:3px 4px;padding:3px 6px;border:1px solid #ccc;border-radius:3px;background:#e0f7fa;font-size:11px;">${v}</span>`
                      )
                      .join("")
                  : `<em>-</em>`
              }
            </div>`
        )
        .join("")}
      <hr style="margin:12px 0;"/>
      <p style="font-size:12px;"><strong>Remarks:</strong> ${
        afterReport.remarks || "-"
      }</p>
    `;

    document.body.appendChild(afterSection);

    const afterCanvas = await html2canvas(afterSection, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: afterSection.scrollWidth,
      windowHeight: afterSection.scrollHeight,
    });

    const afterImg = afterCanvas.toDataURL("image/png");
    pdf.addPage();

    const afterImgHeight = (afterCanvas.height * pdfWidth) / afterCanvas.width;
    let afterHeightLeft = afterImgHeight;
    let afterPosition = 0;

    while (afterHeightLeft > 0) {
      pdf.addImage(afterImg, "PNG", 0, afterPosition, pdfWidth, afterImgHeight);
      afterHeightLeft -= pdfHeight;
      afterPosition -= pdfHeight;
      if (afterHeightLeft > 0) pdf.addPage();
    }

    document.body.removeChild(afterSection);
  }

  /* -----------------------------------------------------------
     3️⃣ Save Final PDF
  ----------------------------------------------------------- */
  pdf.save(`Bogie_${detailItem.bogieNo}_Inspection_Report.pdf`);
};

const handleEditClick = () => {
  // Deep clone current record into editable state
  const clone = structuredClone(detailItem);

  // 🛠️ Initialize missing nested objects to avoid undefined errors
  [
    "wheelBase",
    "bogieDiagonal",
    "bogieJournalCentre",
    "sideFrameJaw",
    "brakeBeamPocket",
    "sideBearerCentre",
    "pushRodCheck",
    "endPullRodCheck",
    "brakeShoeCheck",
    "springVisualCheck",
  ].forEach((key) => {
    if (!clone[key]) clone[key] = { check: 0, photo: "", visual: {} };
  });

  setEditForm(clone);
  setEditMode(true);
};

const handleEditChange = (path, value) => {
  setEditForm((prev) => {
    const updated = { ...prev };
    const keys = path.split(".");
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] = obj[keys[i]] || {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    return updated;
  });
};

const handleSaveUpdate = async () => {
  try {
    const res = await api.put(`/bogie-inspections/${editForm._id}`, editForm);
    alert("✅ Inspection updated successfully!");
    setDetailItem(res.data.data);  // update modal with latest data
    setEditMode(false);            // exit edit mode
    fetchData();                   // refresh main table
  } catch (err) {
    console.error(err);
    alert("❌ Failed to update inspection data");
  }
};
  /* -----------------------------------------------------------
     ✅ Render
  ----------------------------------------------------------- */

  return (
    <Box p={3} sx={{ background: "#eef2ff", minHeight: "100vh" }}>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              label="From Date"
              type="date"
              fullWidth
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="To Date"
              type="date"
              fullWidth
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6} display="flex" gap={1}>
            <Button variant="contained" onClick={() => fetchData(true)} sx={{ flex: 1 }}>
              Filter
            </Button>
            <Button variant="outlined" color="secondary" onClick={handleClear} sx={{ flex: 1 }}>
              Clear
            </Button>
            <Button variant="contained" color="success" onClick={handleExportExcel} sx={{ flex: 1 }}>
              Excel
            </Button>
            <Button variant="contained" color="warning" onClick={handleExportPDF} sx={{ flex: 1 }}>
              PDF
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ====== Dashboard Table (with Images) ====== */}
      <Box ref={pdfRef}>
        <Paper sx={{ p: 0, overflow: "auto", borderRadius: 0 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ "& th": { background: "#f5f7ff", fontWeight: 700 } }}>
                <TableCell>SL</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Bogie No.</TableCell>
                <TableCell>Make</TableCell>
                <TableCell>Bogie Type</TableCell>
                <TableCell align="center">Wheel Base</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">Bogie Diagonal</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">Journal Centre</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">Side Frame Jaw</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">Brake Beam Pocket</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">Side Bearer Centre</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">Push Rod</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">End Pull Rod</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">Brake Shoe</TableCell>
                <TableCell align="center">Photo</TableCell>
                <TableCell align="center">Spring Visual</TableCell>
                <TableCell align="center">Adopter</TableCell>
                <TableCell align="center">Remarks</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={row._id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>{row.wagonType}</TableCell>

                  {/* 🔗 Clickable Bogie No */}
                  <TableCell>
  <Button
    variant="text"
    sx={{
      textTransform: "none",
      fontWeight: 600,
      color: "#1a73e8",
    }}
    onClick={() => {
      setDetailItem(row);
      fetchAfterWheelingReport(row.bogieNo); // ✅ fetch visual inspection too
    }}
  >
    {row.bogieNo}
  </Button>
</TableCell>


                  <TableCell>{row.bogieMake}</TableCell>
                  <TableCell>{row.bogieType}</TableCell>

                  {/* With images */}
                  <TableCell align="center">{renderCheck(row.wheelBase)}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.wheelBase?.photo} /></TableCell>
                  <TableCell align="center">{renderCheck(row.bogieDiagonal)}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.bogieDiagonal?.photo} /></TableCell>
                  <TableCell align="center">{renderCheck(row.bogieJournalCentre)}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.bogieJournalCentre?.photo} /></TableCell>
                  <TableCell align="center">{renderCheck(row.sideFrameJaw)}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.sideFrameJaw?.photo} /></TableCell>
                  <TableCell align="center">{row.brakeBeamPocket?.value}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.brakeBeamPocket?.photo} /></TableCell>
                  <TableCell align="center">{row.sideBearerCentre?.value}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.sideBearerCentre?.photo} /></TableCell>
                  <TableCell align="center">{renderCheck(row.pushRodCheck)}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.pushRodCheck?.photo} /></TableCell>
                  <TableCell align="center">{renderCheck(row.endPullRodCheck)}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.endPullRodCheck?.photo} /></TableCell>
                  <TableCell align="center">{renderCheck(row.brakeShoeCheck)}</TableCell>
                  <TableCell align="center"><PhotoThumb file={row.brakeShoeCheck?.photo} /></TableCell>
                  <TableCell align="center">{renderCheck(row.springVisualCheck)}</TableCell>
                  <TableCell align="center">{row.adopterType}</TableCell>
                  <TableCell align="center">{row.remarks}</TableCell>
                </TableRow>
                
              ))}
            </TableBody>
          </Table>
          
        </Paper>
      </Box>

      {/* 🟢 Detail Modal */}
      {/* 🟢 Detail Modal */}
<Dialog open={!!detailItem} onClose={() => setDetailItem(null)} fullWidth maxWidth="md">
  {detailItem && (
    <>
      <DialogTitle>
        <Typography fontWeight={700}>
          Bogie Inspection — {detailItem.bogieNo}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Date: {formatDateTime(detailItem.createdAt)}
        </Typography>
      </DialogTitle>

      <DialogContent dividers ref={detailPdfRef}>
  <Typography fontWeight={700} sx={{ mb: 1 }}>
    Inspection Parameters
  </Typography>

  {/* ==================== Before-Wheeling Inspection (Editable) ==================== */}
  <Table size="small">
  <TableHead>
    <TableRow sx={{ background: "#f3f4f6" }}>
      <TableCell>Parameter</TableCell>
      <TableCell align="center">Measured Value</TableCell>
      <TableCell align="center">Status</TableCell>
      <TableCell align="center">Image</TableCell>
      <TableCell align="center">Visual Conditions</TableCell>
    </TableRow>
  </TableHead>

  <TableBody>
    {[
      ["Wheel Base", "wheelBase"],
      ["Bogie Diagonal", "bogieDiagonal"],
      ["Journal Centre", "bogieJournalCentre"],
      ["Side Frame Jaw", "sideFrameJaw"],
      ["Brake Beam Pocket", "brakeBeamPocket"],
      ["Side Bearer Centre", "sideBearerCentre"],
      ["Push Rod", "pushRodCheck"],
      ["End Pull Rod", "endPullRodCheck"],
      ["Brake Shoe", "brakeShoeCheck"],
      ["Spring Visual", "springVisualCheck"],
    ].map(([label, key]) => {
      const obj = editMode ? editForm[key] : detailItem[key];

      // ✅ Only these have numeric measured values
      const measurableFields = [
        "wheelBase",
        "bogieDiagonal",
        "bogieJournalCentre",
        "brakeBeamPocket",
        "sideBearerCentre",
      ];
      const isMeasurable = measurableFields.includes(key);

      return (
        <TableRow key={key}>
          <TableCell>{label}</TableCell>

         {/* ✅ Measured Value Column (Editable) */}
<TableCell align="center">
  {(() => {
    const isMeasurable = [
      "wheelBase",
      "bogieDiagonal",
      "bogieJournalCentre",
      "brakeBeamPocket",
      "sideBearerCentre",
    ].includes(key);

    if (!isMeasurable)
      return <Typography color="text.secondary">–</Typography>;

    // Show editable field if edit mode is active
    if (editMode) {
      return (
        <TextField
          type="number"
          size="small"
          value={obj?.value || ""}
          placeholder="Enter value"
          onChange={(e) =>
            handleEditChange(`${key}.value`, e.target.value)
          }
          InputProps={{
            endAdornment: (
              <Typography
                sx={{ ml: 0.5, color: "text.secondary", fontSize: 12 }}
              >
                mm
              </Typography>
            ),
          }}
          sx={{
            width: 120,
            "& input": { textAlign: "center" },
          }}
        />
      );
    }

    // Otherwise, show the saved measured value (or dash)
    return obj?.value ? (
      <Typography fontWeight={600}>{obj.value} mm</Typography>
    ) : (
      <Typography color="text.secondary">–</Typography>
    );
  })()}
</TableCell>


          {/* ✅ Status */}
          <TableCell align="center">
            {editMode ? (
              <TextField
                select
                size="small"
                value={obj?.check ?? 0}
                onChange={(e) =>
                  handleEditChange(`${key}.check`, parseInt(e.target.value))
                }
                SelectProps={{ native: true }}
                sx={{ width: 110 }}
              >
                <option value="1">OK</option>
                <option value="-1">NOT OK</option>
                <option value="0">Pending</option>
              </TextField>
            ) : (
              renderCheckChip(obj)
            )}
          </TableCell>

          {/* ✅ Photo */}
          <TableCell align="center">
            {editMode ? (
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleEditChange(`${key}.photo`, e.target.files[0]?.name)
                }
              />
            ) : (
              <PhotoThumb file={obj?.photo} />
            )}
          </TableCell>

          {/* ✅ Visual Conditions */}
          <TableCell align="center">
            {editMode ? (
              <TextField
                placeholder="Enter comma-separated visuals"
                size="small"
                fullWidth
                value={
                  obj?.visual
                    ? Object.keys(obj.visual)
                        .filter((k) => obj.visual[k])
                        .join(", ")
                    : ""
                }
                onChange={(e) => {
                  const values = e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean);
                  const visualObj = {};
                  values.forEach((v) => (visualObj[v] = true));
                  handleEditChange(`${key}.visual`, visualObj);
                }}
              />
            ) : (
              renderVisualList(obj?.visual)
            )}
          </TableCell>
        </TableRow>
      );
    })}
  </TableBody>
</Table>

<Divider sx={{ my: 2 }} />


  {/* ==================== Other Fields ==================== */}
  <Grid container spacing={2}>
  <Grid item xs={6}>
    <Typography fontWeight={700}>Adopter Type</Typography>
    {editMode ? (
      <TextField
        fullWidth
        size="small"
        value={editForm.adopterType || ""}
        onChange={(e) => handleEditChange("adopterType", e.target.value)}
      />
    ) : (
      <Typography>{detailItem.adopterType || "-"}</Typography>
    )}
  </Grid>

  <Grid item xs={6}>
    <Typography fontWeight={700}>Inspector Signature</Typography>
    <PhotoThumb file={detailItem.inspectorSignature} />
  </Grid>

  <Grid item xs={12}>
    <Typography fontWeight={700}>Remarks</Typography>
    {editMode ? (
      <TextField
        fullWidth
        multiline
        minRows={2}
        value={editForm.remarks || ""}
        onChange={(e) => handleEditChange("remarks", e.target.value)}
      />
    ) : (
      <Typography>{detailItem.remarks || "-"}</Typography>
    )}
  </Grid>
</Grid>

  {/* ==================== After-Wheeling Report ==================== */}
  <Box sx={{ mt: 3 }}>
    <Button
      variant="outlined"
      fullWidth
      onClick={() => setAfterOpen(!afterOpen)}
      sx={{ mb: 1 }}
    >
      {afterOpen
        ? "Hide After-Wheeling Visual Inspection"
        : "Show After-Wheeling Visual Inspection"}
    </Button>

    {afterOpen && (
      <Paper sx={{ p: 2, background: "#fafafa", borderRadius: 2 }}>
        {afterReport ? (
          <>
            <Typography fontWeight={700} mb={1}>
              After-Wheeling Visual Inspection Report
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Date:{" "}
              {afterReport.date
                ? new Date(afterReport.date).toLocaleDateString("en-GB")
                : "-"}{" "}
              | Inspector: {afterReport.inspectorName || "-"}
            </Typography>

            <Grid container spacing={1}>
              {Object.entries(afterReport.sections || {}).map(
                ([section, values]) => (
                  <Grid item xs={12} md={6} key={section}>
                    <Paper sx={{ p: 2, mb: 1 }}>
                      <Typography fontWeight={700}>
                        {section.replace(/([A-Z])/g, " $1")}
                      </Typography>
                      {Array.isArray(values) && values.length > 0 ? (
                        values.map((v) => (
                          <Chip
                            key={v}
                            label={v}
                            size="small"
                            sx={{
                              mr: 0.5,
                              mb: 0.5,
                              background: "#e0f7fa",
                            }}
                          />
                        ))
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          -
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={700}>Remarks</Typography>
            <Typography>{afterReport.remarks || "-"}</Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No After-Wheeling Visual Inspection record found for this bogie.
          </Typography>
        )}
      </Paper>
    )}
  </Box>
</DialogContent>

      <DialogActions>
  {!editMode ? (
    <>
      <Button onClick={() => setDetailItem(null)}>Close</Button>
      <Button variant="contained" color="info" onClick={handleEditClick}>
        Edit
      </Button>
      <Button variant="contained" color="warning" onClick={handleExportDetailPDF}>
        Download PDF
      </Button>
    </>
  ) : (
    <>
      <Button color="secondary" onClick={() => setEditMode(false)}>
        Cancel
      </Button>
      <Button variant="contained" color="success" onClick={handleSaveUpdate}>
        Save Changes
      </Button>
    </>
  )}
</DialogActions>

    </>
  )}
</Dialog>


      {/* 🖼️ Image Viewer */}
      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="md">
        <DialogContent sx={{ background: "#000", textAlign: "center" }}>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="zoom"
              style={{ width: "100%", height: "auto", borderRadius: 6 }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
<style>{`
  /* 🧾 PDF Capture - Fit Table to One Page */
  .pdf-capture table {
    border-collapse: collapse;
    width: 100% !important;
    table-layout: fixed !important;
  }

  .pdf-capture th,
  .pdf-capture td {
    text-align: center !important;
    vertical-align: middle !important;
    font-size: 9.5px !important;
    padding: 4px 2px !important;
    border: 0.3px solid #999;
    word-wrap: break-word;
  }

  .pdf-capture td img {
    width: 50px !important;
    height: 35px !important;
    object-fit: cover !important;
    border-radius: 3px;
    margin-top: 3px !important;
  }

  .pdf-capture tr {
    height: auto !important;
    page-break-inside: avoid !important;
  }

  @media print {
    @page {
      size: A4 landscape;
      margin: 6mm;
    }
  }

  .pdf-capture {
    background: #fff !important;
  }
    .pdf-capture {
  background: #fff !important;
}

.pdf-capture table {
  width: 100% !important;
  border-collapse: collapse;
}

.pdf-capture th,
.pdf-capture td {
  font-size: 9px !important;
  padding: 4px 3px !important;
  border: 0.3px solid #aaa;
  text-align: center !important;
  vertical-align: middle !important;
}

.pdf-capture img {
  max-width: 80px !important;
  height: auto !important;
  border-radius: 3px !important;
}
`}</style>
