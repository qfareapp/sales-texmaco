import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api";
import { useSearchParams } from "react-router-dom";
import { buildProjectLabel } from "./wagonDataSheetConfig";

const initialForm = {
  projectId: "",
  rowId: "",
  tareWeight: "",
  txrFitDate: "",
  manufactureDate: "",
  rfidNo: "",
  dmNo: "",
  dmDate: "",
  rohDate: "",
  returnOrPohDate: "",
};

function SectionHeader({ label, color = "#374151" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: color }} />
      <Typography
        variant="subtitle2"
        fontWeight={700}
        color={color}
        sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: `${color}30`, ml: 1 }} />
    </Box>
  );
}

export default function WagonDataSheetFinalDetailsForm() {
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") || "";
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ ...initialForm, projectId: preselectedProjectId });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedRow = useMemo(
    () => rows.find((row) => row._id === form.rowId) || null,
    [rows, form.rowId]
  );

  useEffect(() => {
    api
      .get("/wagon-data-sheet/projects")
      .then(({ data }) => setProjects(data?.data || []))
      .catch(() => setError("Failed to load projects."));
  }, []);

  useEffect(() => {
    if (!preselectedProjectId) return;
    setForm((prev) => ({ ...prev, projectId: prev.projectId || preselectedProjectId }));
  }, [preselectedProjectId]);

  useEffect(() => {
    if (!form.projectId) {
      setRows([]);
      return;
    }

    api
      .get("/wagon-data-sheet/rows/final-details-options", { params: { projectId: form.projectId } })
      .then(({ data }) => setRows(data?.data || []))
      .catch(() => setError("Failed to load completed second-zone rows."));
  }, [form.projectId]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRowChange = (event) => {
    const rowId = event.target.value;
    const row = rows.find((item) => item._id === rowId);
    setForm((prev) => ({
      ...prev,
      rowId,
      tareWeight: row?.finalAssembly?.tareWeight || "",
      txrFitDate: row?.finalAssembly?.txrFitDate || "",
      manufactureDate: row?.finalAssembly?.manufactureDate || "",
      rfidNo: row?.finalAssembly?.rfidNo || "",
      dmNo: row?.finalAssembly?.dmNo || "",
      dmDate: row?.finalAssembly?.dmDate || "",
      rohDate: row?.finalAssembly?.rohDate || "",
      returnOrPohDate: row?.finalAssembly?.returnOrPohDate || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/wagon-data-sheet/rows/final-details", form);
      setSuccess("Final details saved successfully.");
      const { data } = await api.get("/wagon-data-sheet/rows/final-details-options", {
        params: { projectId: form.projectId },
      });
      const refreshed = data?.data || [];
      setRows(refreshed);
      const current = refreshed.find((row) => row._id === form.rowId);
      if (current) {
        setForm((prev) => ({
          ...prev,
          tareWeight: current.finalAssembly?.tareWeight || "",
          txrFitDate: current.finalAssembly?.txrFitDate || "",
          manufactureDate: current.finalAssembly?.manufactureDate || "",
          rfidNo: current.finalAssembly?.rfidNo || "",
          dmNo: current.finalAssembly?.dmNo || "",
          dmDate: current.finalAssembly?.dmDate || "",
          rohDate: current.finalAssembly?.rohDate || "",
          returnOrPohDate: current.finalAssembly?.returnOrPohDate || "",
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save final details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#374151",
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>W</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Wagon Data Sheet
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: "uppercase", letterSpacing: 1 }}
          >
            Final Details Entry
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7 }}>
        Use this third stage after first zone and second zone are complete.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #cbd5e1", overflow: "hidden" }}
      >
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
          <Typography variant="subtitle2" fontWeight={700} color="#374151">
            Select Completed Row
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                id="final-details-project"
                select
                label="Project"
                value={form.projectId}
                onChange={handleChange("projectId")}
                fullWidth
                required
                helperText="Choose a project to load rows that already completed second zone"
              >
                {projects.map((project) => (
                  <MenuItem key={project._id} value={project._id}>
                    {buildProjectLabel(project)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                id="final-details-tex-no-link"
                select
                label="TEX No. Link"
                value={form.rowId}
                onChange={handleRowChange}
                fullWidth
                required
                disabled={!form.projectId}
                helperText={
                  !form.projectId
                    ? "Select a project first"
                    : "Rows shown here have first and second zone completed"
                }
              >
                {rows.map((row) => (
                  <MenuItem key={row._id} value={row._id}>
                    {`TEX: ${row.texNo || "-"} · Wagon: ${row.wagonNo || "-"}`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {selectedRow && (
            <Box
              sx={{
                mt: 2,
                pt: 2,
                borderTop: "1px dashed #94a3b8",
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Chip
                size="small"
                label={`TEX: ${selectedRow.texNo || "-"}`}
                sx={{ bgcolor: "#e2e8f0", fontWeight: 700 }}
              />
              <Chip size="small" label={`Wagon: ${selectedRow.wagonNo || "-"}`} variant="outlined" />
              <Chip
                size="small"
                label={`Wheel Key: ${selectedRow.wheelDataKey || "-"}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={
                  selectedRow.finalAssembly?.submittedAt
                    ? "Final Details Saved"
                    : "Final Details Pending"
                }
                color={selectedRow.finalAssembly?.submittedAt ? "success" : "warning"}
              />
            </Box>
          )}
        </Box>
      </Paper>

      <form onSubmit={handleSubmit}>
        <Paper
          elevation={0}
          sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #cbd5e1", overflow: "hidden" }}
        >
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#374151">
              Final Details - Entered After Full Assembly
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This section is intentionally separate from wheel assembly entry and should be filled
              only after full assembly is complete.
            </Typography>

            <SectionHeader label="Weights & Dates" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Tare Weight (Tonne)"
                  value={form.tareWeight}
                  onChange={handleChange("tareWeight")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  id="final-details-txr-fit-date"
                  label="TXR Fit Date"
                  type="date"
                  value={form.txrFitDate}
                  onChange={handleChange("txrFitDate")}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  id="final-details-mfg-date"
                  label="Mfg. Date"
                  type="date"
                  value={form.manufactureDate}
                  onChange={handleChange("manufactureDate")}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  id="final-details-roh-date"
                  label="ROH Date"
                  type="date"
                  value={form.rohDate}
                  onChange={handleChange("rohDate")}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  id="final-details-return-poh-date"
                  label="Return / POH Date"
                  type="date"
                  value={form.returnOrPohDate}
                  onChange={handleChange("returnOrPohDate")}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            <SectionHeader label="Reference Numbers" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="RFID No."
                  value={form.rfidNo}
                  onChange={handleChange("rfidNo")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="DM No."
                  value={form.dmNo}
                  onChange={handleChange("dmNo")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="DM Date"
                  type="date"
                  value={form.dmDate}
                  onChange={handleChange("dmDate")}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        </Paper>

        <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" }, mb: 4 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || !form.rowId}
            sx={{
              width: { xs: "100%", sm: "auto" },
              px: 5,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: "1rem",
              bgcolor: "#374151",
              "&:hover": { bgcolor: "#1f2937" },
              "&:disabled": { bgcolor: "#ccc" },
            }}
          >
            {saving ? "Saving..." : "Save Final Details"}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
