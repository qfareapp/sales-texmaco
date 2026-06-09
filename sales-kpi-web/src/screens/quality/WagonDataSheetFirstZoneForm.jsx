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
import { buildProjectLabel, wagonConfigurationOptions } from "./wagonDataSheetConfig";

const initialForm = {
  projectId: "",
  texNo: "",
  wagonNo: "",
  wagonConfiguration: "",
  wheelDataKey: "",
  bogieMake: "",
  bogieSerialNumbers: "",
  couplerMake: "",
  couplerSerialNumbers: "",
  draftGearMake: "",
  draftGearSerialNumbers: "",
  dvMake: "",
  dvSerialNumbers: "",
  bcMake: "",
  bcSerialNumbers: "",
  arMake: "",
  arSerialNumbers: "",
  sabMake: "",
  atlMake: "",
  crfMake: "",
};

const pairFields = [
  ["bogie", "Bogie"],
  ["coupler", "Coupler"],
  ["draftGear", "Draft Gear"],
  ["dv", "DV"],
  ["bc", "BC"],
  ["ar", "AR"],
];

const normalizeWheelDataKey = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

function SectionHeader({ label, color = "#2e7d32" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: color }} />
      <Typography variant="subtitle1" fontWeight={700} color={color}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: `${color}33`, ml: 1 }} />
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
        bgcolor: "rgba(255,255,255,0.6)",
        border: "1px solid rgba(146,208,80,0.3)",
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
  texNo: row?.texNo || "",
  wagonNo: row?.wagonNo || "",
  wagonConfiguration: row?.wagonConfiguration || "",
  wheelDataKey: row?.wheelDataKey || "",
  bogieMake: row?.firstZone?.bogie?.make || "",
  bogieSerialNumbers: (row?.firstZone?.bogie?.serialNumbers || []).join("\n"),
  couplerMake: row?.firstZone?.coupler?.make || "",
  couplerSerialNumbers: (row?.firstZone?.coupler?.serialNumbers || []).join("\n"),
  draftGearMake: row?.firstZone?.draftGear?.make || "",
  draftGearSerialNumbers: (row?.firstZone?.draftGear?.serialNumbers || []).join("\n"),
  dvMake: row?.firstZone?.dv?.make || "",
  dvSerialNumbers: (row?.firstZone?.dv?.serialNumbers || []).join("\n"),
  bcMake: row?.firstZone?.bc?.make || "",
  bcSerialNumbers: (row?.firstZone?.bc?.serialNumbers || []).join("\n"),
  arMake: row?.firstZone?.ar?.make || "",
  arSerialNumbers: (row?.firstZone?.ar?.serialNumbers || []).join("\n"),
  sabMake: row?.firstZone?.sabMake || "",
  atlMake: row?.firstZone?.atlMake || "",
  crfMake: row?.firstZone?.crfMake || "",
});

export default function WagonDataSheetFirstZoneForm() {
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadedRowId, setLoadedRowId] = useState("");

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === form.projectId) || null,
    [projects, form.projectId]
  );

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
    fetchRows(form.projectId).catch(() => setError("Failed to load project rows."));
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
      await api.post("/wagon-data-sheet/rows/first-zone", {
        ...form,
        wheelDataKey: normalizeWheelDataKey(form.wheelDataKey),
      });
      setSuccess(linkedRow ? "First zone row updated successfully." : "First zone row saved successfully.");
      const currentProjectId = form.projectId;
      setLoadedRowId("");
      setForm({ ...initialForm, projectId: currentProjectId });
      await Promise.all([fetchProjects(), fetchRows(currentProjectId)]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save first zone row.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#1a6b3c",
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
            First Zone Entry
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7 }}>
        First zone and second zone can be filled in any order. Both screens meet on the same
        wheel data link.
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
          <Grid container spacing={2} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <TextField
                id="first-zone-project"
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
            <Grid item xs={12} md={6}>
              <TextField
                id="first-zone-existing-wheel-data-link"
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
          </Grid>

          {selectedProject && (
            <Box sx={{ mt: 2, pt: 2, borderTop: "1px dashed #b3d9f0" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={`P.O.: ${selectedProject.contractPoNumber || "-"}`}
                  color="info"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  size="small"
                  label={`Offered: ${selectedProject.wagonsOfferedForInspection || "-"}`}
                  variant="outlined"
                  color="info"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  size="small"
                  label={`Rows: ${rows.length}`}
                  variant="outlined"
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            </Box>
          )}
        </Box>
      </Paper>

      <form onSubmit={handleSubmit}>
        <Paper
          elevation={0}
          sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #92d050", overflow: "hidden" }}
        >
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#e7f6dd", borderBottom: "1px solid #92d050" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#2e7d32">
              Wagon Identification and Component Data
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f5fbf0" }}>
            <SectionHeader label="Wagon Identification" color="#2e7d32" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  id="first-zone-texno"
                  label="TEX No."
                  value={form.texNo}
                  onChange={handleChange("texNo")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  id="first-zone-wagonno"
                  label="Wagon No."
                  value={form.wagonNo}
                  onChange={handleChange("wagonNo")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  id="first-zone-wagon-configuration"
                  select
                  label="Configuration"
                  value={form.wagonConfiguration}
                  onChange={handleChange("wagonConfiguration")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                >
                  {wagonConfigurationOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                border: "2px solid #f59e0b",
                bgcolor: "#fffbeb",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color="#92400e">
                  Wheel Data Link
                </Typography>
              </Box>
              <TextField
                id="first-zone-wheel-data-key"
                label="Wheel Data Link *"
                value={form.wheelDataKey}
                onChange={handleWheelDataKeyChange}
                fullWidth
                required
                helperText="Use the same wheel data link in both zones. Existing rows will load automatically when the key matches."
                sx={{ bgcolor: "white", borderRadius: 1 }}
                InputProps={{
                  sx: { fontWeight: 700, fontSize: "1.05rem", textTransform: "uppercase" },
                }}
              />
            </Box>

            {linkedRow && (
              <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip size="small" label={`SL. No.: ${linkedRow.slNo || "-"}`} color="success" />
                <Chip size="small" label={`Wheel Link: ${linkedRow.wheelDataKey || "-"}`} variant="outlined" />
                <Chip size="small" label={linkedRow.firstZone?.submittedAt ? "First Zone Saved" : "First Zone Pending"} color={linkedRow.firstZone?.submittedAt ? "success" : "warning"} />
                <Chip size="small" label={linkedRow.secondZone?.submittedAt ? "Second Zone Saved" : "Second Zone Pending"} color={linkedRow.secondZone?.submittedAt ? "success" : "default"} />
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />

            <SectionHeader label="Component Details" color="#2e7d32" />
            <Stack spacing={2}>
              {pairFields.map(([key, label]) => (
                <ComponentRow key={key} keyName={key} label={label} form={form} handleChange={handleChange} />
              ))}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <SectionHeader label="Additional Components" color="#2e7d32" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="SAB Make"
                  value={form.sabMake}
                  onChange={handleChange("sabMake")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="ATL Make"
                  value={form.atlMake}
                  onChange={handleChange("atlMake")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="CRF Make"
                  value={form.crfMake}
                  onChange={handleChange("crfMake")}
                  fullWidth
                  size="small"
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
            disabled={saving || !form.projectId || !normalizeWheelDataKey(form.wheelDataKey)}
            sx={{
              width: { xs: "100%", sm: "auto" },
              px: 5,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: "1rem",
              bgcolor: "#1a6b3c",
              "&:hover": { bgcolor: "#155730" },
              "&:disabled": { bgcolor: "#ccc" },
              boxShadow: "0 4px 14px rgba(26,107,60,0.35)",
            }}
          >
            {saving ? "Saving..." : linkedRow ? "Update First Zone Row" : "Save First Zone Row"}
          </Button>
        </Box>
      </form>

      {form.projectId && (
        <>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Recent Rows
          </Typography>
          {rows.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                borderRadius: 3,
                border: "1.5px dashed #ccc",
                color: "text.secondary",
              }}
            >
              No wagon rows for this project yet.
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {rows.slice(0, 10).map((row) => (
                <Grid item xs={12} sm={6} key={row._id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: "1.5px solid #cbd5e1",
                      bgcolor: "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Typography fontWeight={700} fontSize="0.92rem" noWrap>
                        {row.wheelDataKey || "-"}
                      </Typography>
                      <Chip
                        size="small"
                        label={`SL. No. ${row.slNo || "-"}`}
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                      />
                    </Box>
                    <Divider />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          TEX No.
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {row.texNo || "-"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Wagon No.
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {row.wagonNo || "-"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Configuration
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {row.wagonConfiguration || "-"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          First / Second Zone
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {row.firstZone?.submittedAt ? "Saved" : "Pending"} /{" "}
                          {row.secondZone?.submittedAt ? "Saved" : "Pending"}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}
