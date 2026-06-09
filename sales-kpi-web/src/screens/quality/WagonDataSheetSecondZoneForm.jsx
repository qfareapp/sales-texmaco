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
  wheelDataKey: "",
  axleMake: "",
  axleSerialNumbers: "",
  wheelMake: "",
  wheelSerialNumbers: "",
  bearingMake: "",
  bearingSerialNumbers: "",
};

const normalizeWheelDataKey = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

function SectionHeader({ label, color = "#b45309" }) {
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
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}
        >
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
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}
        >
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

const rowToForm = (row, projectId) => ({
  ...initialForm,
  projectId,
  wheelDataKey: row?.wheelDataKey || "",
  axleMake: row?.secondZone?.axle?.make || "",
  axleSerialNumbers: (row?.secondZone?.axle?.serialNumbers || []).join("\n"),
  wheelMake: row?.secondZone?.wheel?.make || "",
  wheelSerialNumbers: (row?.secondZone?.wheel?.serialNumbers || []).join("\n"),
  bearingMake: row?.secondZone?.bearing?.make || "",
  bearingSerialNumbers: (row?.secondZone?.bearing?.serialNumbers || []).join("\n"),
});

export default function WagonDataSheetSecondZoneForm() {
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadedRowId, setLoadedRowId] = useState("");

  const normalizedWheelDataKey = useMemo(
    () => normalizeWheelDataKey(form.wheelDataKey),
    [form.wheelDataKey]
  );

  const linkedRow = useMemo(
    () =>
      rows.find((row) => normalizeWheelDataKey(row.wheelDataKey) === normalizedWheelDataKey) || null,
    [rows, normalizedWheelDataKey]
  );

  const fetchProjects = async () => {
    const { data } = await api.get("/wagon-data-sheet/projects");
    setProjects(data?.data || []);
  };

  const fetchRows = async (projectId) => {
    if (!projectId) {
      setRows([]);
      return;
    }
    const { data } = await api.get("/wagon-data-sheet/rows", { params: { projectId } });
    setRows(data?.data || []);
  };

  useEffect(() => {
    fetchProjects().catch(() => setError("Failed to load projects."));
  }, []);

  useEffect(() => {
    fetchRows(form.projectId).catch(() => setError("Failed to load wheel data links."));
  }, [form.projectId]);

  useEffect(() => {
    if (!linkedRow || !form.projectId) return;
    if (linkedRow._id === loadedRowId) return;
    setLoadedRowId(linkedRow._id);
    setForm(rowToForm(linkedRow, form.projectId));
  }, [form.projectId, linkedRow, loadedRowId]);

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleProjectChange = (event) => {
    const projectId = event.target.value;
    setLoadedRowId("");
    setForm({ ...initialForm, projectId });
  };

  const handleWheelDataKeyChange = (event) => {
    setLoadedRowId("");
    setForm((prev) => ({ ...prev, wheelDataKey: event.target.value }));
  };

  const handleExistingRowChange = (event) => {
    const rowId = event.target.value;
    if (!rowId) {
      setLoadedRowId("");
      setForm((prev) => ({ ...initialForm, projectId: prev.projectId, wheelDataKey: prev.wheelDataKey }));
      return;
    }

    const row = rows.find((item) => item._id === rowId);
    if (!row) return;
    setLoadedRowId(row._id);
    setForm(rowToForm(row, form.projectId));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/wagon-data-sheet/rows/second-zone", {
        ...form,
        wheelDataKey: normalizeWheelDataKey(form.wheelDataKey),
      });
      setSuccess(linkedRow ? "Second zone row updated successfully." : "Second zone row saved successfully.");
      const currentProjectId = form.projectId;
      setLoadedRowId("");
      setForm({ ...initialForm, projectId: currentProjectId });
      await Promise.all([fetchProjects(), fetchRows(currentProjectId)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save second zone row.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
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
            Second Zone Entry
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7 }}>
        Second zone can start before first zone. Use the same wheel data link in both screens.
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
        sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #b3d9f0", overflow: "hidden" }}
      >
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#e3f4fd", borderBottom: "1px solid #b3d9f0" }}>
          <Typography variant="subtitle2" fontWeight={700} color="#0369a1">
            Project and Wheel Data Link
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                id="second-zone-project"
                select
                label="Select Project"
                value={form.projectId}
                onChange={handleProjectChange}
                fullWidth
                required
                helperText="Choose a project to begin or continue a wagon row"
              >
                {projects.map((project) => (
                  <MenuItem key={project._id} value={project._id}>
                    {buildProjectLabel(project)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                id="second-zone-existing-wheel-data-link"
                select
                label="Existing Wheel Data Link"
                value={linkedRow?._id || ""}
                onChange={handleExistingRowChange}
                fullWidth
                disabled={!form.projectId}
                helperText={
                  !form.projectId
                    ? "Select a project first"
                    : rows.length === 0
                    ? "No wheel data links created for this project yet"
                    : "Optional: select a saved wheel data link to continue editing it"
                }
              >
                <MenuItem value="">Create or type a new wheel data link</MenuItem>
                {rows.map((row) => (
                  <MenuItem key={row._id} value={row._id}>
                    {`${row.wheelDataKey || "-"} · TEX: ${row.texNo || "-"} · Wagon: ${row.wagonNo || "-"}`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                id="second-zone-wheel-data-link"
                label="Wheel Data Link *"
                value={form.wheelDataKey}
                onChange={handleWheelDataKeyChange}
                fullWidth
                required
                disabled={!form.projectId}
                helperText={
                  !form.projectId
                    ? "Select a project first"
                    : "Type a new wheel data link or use the existing selector"
                }
                InputProps={{
                  sx: { fontWeight: 700, fontSize: "1.05rem", textTransform: "uppercase" },
                }}
              />
            </Grid>
          </Grid>

          {linkedRow && (
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
              <Chip
                size="small"
                label={`SL. No.: ${linkedRow.slNo || "-"}`}
                sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700, border: "1px solid #f59e0b" }}
              />
              <Chip size="small" label={`TEX: ${linkedRow.texNo || "-"}`} variant="outlined" color="info" sx={{ fontWeight: 600 }} />
              <Chip size="small" label={`Wagon: ${linkedRow.wagonNo || "-"}`} variant="outlined" color="info" sx={{ fontWeight: 600 }} />
              <Chip size="small" label={linkedRow.firstZone?.submittedAt ? "First Zone Saved" : "First Zone Pending"} color={linkedRow.firstZone?.submittedAt ? "success" : "warning"} />
              <Chip size="small" label={linkedRow.secondZone?.submittedAt ? "Second Zone Saved" : "Second Zone Pending"} color={linkedRow.secondZone?.submittedAt ? "success" : "default"} />
            </Box>
          )}
        </Box>
      </Paper>

      <form onSubmit={handleSubmit}>
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
          sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #cbd5e1", overflow: "hidden" }}
        >
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #d1d5db" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#374151">
              Next Stage
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="body2" color="text.secondary">
              Once second-zone data is saved, the final details screen can use the same shared wagon row.
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" }, mb: 4 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || !form.projectId || !normalizeWheelDataKey(form.wheelDataKey)}
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
            {saving ? "Saving..." : linkedRow ? "Update Second Zone Row" : "Save Second Zone Data"}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
