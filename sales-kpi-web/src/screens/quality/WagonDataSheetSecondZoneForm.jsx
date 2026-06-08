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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api";
import { buildProjectLabel } from "./wagonDataSheetConfig";

const initialForm = {
  projectId: "",
  rowId: "",
  axleMake: "",
  axleSerialNumbers: "",
  wheelMake: "",
  wheelSerialNumbers: "",
  bearingMake: "",
  bearingSerialNumbers: "",
};

function SectionHeader({ label, color = "#b45309" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: color }} />
      <Typography variant="subtitle2" fontWeight={700} color={color} sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: `${color}30`, ml: 1 }} />
    </Box>
  );
}

function ComponentRow({ keyName, label, form, handleChange }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(234,179,8,0.3)",
      }}
    >
      <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <TextField
          label="Make"
          value={form[`${keyName}Make`]}
          onChange={handleChange(`${keyName}Make`)}
          fullWidth
          size="small"
          sx={{ bgcolor: "white", borderRadius: 1 }}
        />
      </Box>
      <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label} Serial Numbers
        </Typography>
        <TextField
          label="Sl. No. (up to 8)"
          value={form[`${keyName}SerialNumbers`]}
          onChange={handleChange(`${keyName}SerialNumbers`)}
          fullWidth
          size="small"
          multiline
          minRows={2}
          helperText="One per line"
          sx={{ bgcolor: "white", borderRadius: 1 }}
        />
      </Box>
    </Box>
  );
}

export default function WagonDataSheetSecondZoneForm() {
  const [projects, setProjects] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedRow = useMemo(
    () => pendingRows.find((row) => row._id === form.rowId) || null,
    [pendingRows, form.rowId]
  );

  const fetchProjects = async () => {
    const { data } = await api.get("/wagon-data-sheet/projects");
    setProjects(data?.data || []);
  };

  const fetchPendingRows = async (projectId) => {
    if (!projectId) { setPendingRows([]); return; }
    const { data } = await api.get("/wagon-data-sheet/rows/pending-second-zone", { params: { projectId } });
    setPendingRows(data?.data || []);
  };

  useEffect(() => {
    fetchProjects().catch(() => setError("Failed to load projects."));
  }, []);

  useEffect(() => {
    setForm((prev) => ({ ...prev, rowId: "" }));
    fetchPendingRows(form.projectId).catch(() => setError("Failed to load pending rows."));
  }, [form.projectId]);

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/wagon-data-sheet/rows/second-zone", form);
      setSuccess("Second zone row saved successfully.");
      const projectId = form.projectId;
      setForm({ ...initialForm, projectId });
      fetchProjects();
      fetchPendingRows(projectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save second zone row.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      {/* ── Page Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#b45309",
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>⚙️</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Wagon Data Sheet
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Second Zone Entry
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7 }}>
        Yellow fields are completed here. Only first-zone rows with a{" "}
        <Box component="span" sx={{ color: "#b45309", fontWeight: 700 }}>Wheel Data Key</Box>{" "}
        are available for selection.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* ── Selection Card ── */}
      <Paper
        elevation={0}
        sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #b3d9f0", overflow: "hidden" }}
      >
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#e3f4fd", borderBottom: "1px solid #b3d9f0" }}>
          <Typography variant="subtitle2" fontWeight={700} color="#0369a1">
            Link to First Zone Row
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Select Project"
                value={form.projectId}
                onChange={handleChange("projectId")}
                fullWidth
                required
                helperText="Choose a project to load pending rows"
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
                select
                label="Wheel Data Link *"
                value={form.rowId}
                onChange={handleChange("rowId")}
                fullWidth
                required
                disabled={!form.projectId}
                helperText={
                  !form.projectId
                    ? "Select a project first"
                    : pendingRows.length === 0
                    ? "No pending rows — all first zone rows are complete"
                    : "Populated from First Zone entries"
                }
              >
                {pendingRows.map((row) => (
                  <MenuItem key={row._id} value={row._id}>
                    🔑 {row.wheelDataKey} · {row.texNo || "—"} · {row.wagonNo || "—"}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Selected row preview */}
          {selectedRow && (
            <Box
              sx={{
                mt: 2,
                pt: 2,
                borderTop: "1px dashed #f59e0b",
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Chip size="small" label={`🔑 ${selectedRow.wheelDataKey}`} sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700, border: "1px solid #f59e0b" }} />
              <Chip size="small" label={`TEX: ${selectedRow.texNo || "—"}`} variant="outlined" color="info" sx={{ fontWeight: 600 }} />
              <Chip size="small" label={`Wagon: ${selectedRow.wagonNo || "—"}`} variant="outlined" color="info" sx={{ fontWeight: 600 }} />
              <Chip
                size="small"
                label={`Bogie: ${selectedRow.firstZone?.bogie?.make || "—"}`}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Data Entry Form ── */}
      <form onSubmit={handleSubmit}>
        {/* Wheel Component Section */}
        <Paper
          elevation={0}
          sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #fcd34d", overflow: "hidden" }}
        >
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#fef9c3", borderBottom: "1px solid #fcd34d" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#b45309">
              Wheel Assembly Data
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#fffdf0" }}>
            <SectionHeader label="Components" color="#b45309" />
            <Stack spacing={2}>
              <ComponentRow keyName="axle" label="Axle" form={form} handleChange={handleChange} />
              <ComponentRow keyName="wheel" label="Wheel" form={form} handleChange={handleChange} />
              <ComponentRow keyName="bearing" label="Bearing" form={form} handleChange={handleChange} />
            </Stack>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            border: "1.5px solid #cbd5e1",
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #d1d5db" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#374151">
              Next Stage
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="body2" color="text.secondary">
              After saving second-zone wheel assembly data, fill the third segment from the dedicated
              <b> Final Details Entry</b> screen.
            </Typography>
          </Box>
        </Paper>

        {/* Submit */}
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
              bgcolor: "#b45309",
              "&:hover": { bgcolor: "#92400e" },
              "&:disabled": { bgcolor: "#ccc" },
              boxShadow: "0 4px 14px rgba(180,83,9,0.35)",
            }}
          >
            {saving ? "Saving…" : "Save Second Zone Data"}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
