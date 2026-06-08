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
// No @mui/icons-material — using inline SVG icons below
import api from "../../api";
import { buildProjectLabel } from "./wagonDataSheetConfig";

const initialForm = {
  projectId: "",
  slNo: "",
  texNo: "",
  wagonNo: "",
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

export default function WagonDataSheetFirstZoneForm() {
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((p) => p._id === form.projectId) || null,
    [projects, form.projectId]
  );

  const fetchProjects = async () => {
    const { data } = await api.get("/wagon-data-sheet/projects");
    setProjects(data?.data || []);
  };

  const fetchRows = async (projectId) => {
    if (!projectId) { setRows([]); return; }
    const { data } = await api.get("/wagon-data-sheet/rows", { params: { projectId } });
    setRows(data?.data || []);
  };

  useEffect(() => {
    fetchProjects().catch(() => setError("Failed to load projects."));
  }, []);

  useEffect(() => {
    fetchRows(form.projectId).catch(() => setError("Failed to load project rows."));
  }, [form.projectId]);

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/wagon-data-sheet/rows/first-zone", form);
      setSuccess("First zone row saved successfully.");
      const nextProjectId = form.projectId;
      setForm({ ...initialForm, projectId: nextProjectId });
      fetchProjects();
      fetchRows(nextProjectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save first zone row.");
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
            bgcolor: "#1a6b3c",
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>🚃</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Wagon Data Sheet
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            First Zone Entry
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7 }}>
        Green fields are captured here. The amber{" "}
        <Box component="span" sx={{ color: "#b8860b", fontWeight: 700 }}>
          Wheel Data Key
        </Box>{" "}
        is the common handoff used by second zone.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* ── Project Selection Card ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: "1.5px solid #b3d9f0",
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#e3f4fd", borderBottom: "1px solid #b3d9f0" }}>
          <Typography variant="subtitle2" fontWeight={700} color="#0369a1">
            Project Selection
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="stretch">
            <Grid item xs={12} md={8}>
              <TextField
                select
                label="Select Project"
                value={form.projectId}
                onChange={handleChange("projectId")}
                fullWidth
                required
                helperText="Choose a project to begin data entry"
              >
                {projects.map((project) => (
                  <MenuItem key={project._id} value={project._id}>
                    {buildProjectLabel(project)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  height: "100%",
                  minHeight: 64,
                  bgcolor: "#fef3c7",
                  border: "1.5px solid #f59e0b",
                  borderRadius: 2,
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Typography sx={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>🔑</Typography>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#92400e">
                    Common Handoff
                  </Typography>
                  <Typography variant="caption" color="#a16207">
                    Wheel Data Key links to Second Zone
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {selectedProject && (
            <Box sx={{ mt: 2, pt: 2, borderTop: "1px dashed #b3d9f0" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={`P.O.: ${selectedProject.contractPoNumber || "—"}`}
                  color="info"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  size="small"
                  label={`Offered: ${selectedProject.wagonsOfferedForInspection || "—"}`}
                  variant="outlined"
                  color="info"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  size="small"
                  label={`Pending 2nd Zone: ${selectedProject.pendingRows || 0}`}
                  variant="outlined"
                  color="warning"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Data Entry Form ── */}
      <form onSubmit={handleSubmit}>
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            border: "1.5px solid #92d050",
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#e7f6dd", borderBottom: "1px solid #92d050" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#2e7d32">
              Wagon Identification &amp; Component Data
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f5fbf0" }}>
            {/* Wagon ID Row */}
            <SectionHeader label="Wagon Identification" color="#2e7d32" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  label="SL. No."
                  value={form.slNo}
                  onChange={handleChange("slNo")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={5}>
                <TextField
                  label="TEX No."
                  value={form.texNo}
                  onChange={handleChange("texNo")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4} md={5}>
                <TextField
                  label="Wagon No."
                  value={form.wagonNo}
                  onChange={handleChange("wagonNo")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
            </Grid>

            {/* Wheel Data Key – highlighted */}
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
                <Typography sx={{ fontSize: 16, lineHeight: 1 }}>🔑</Typography>
                <Typography variant="caption" fontWeight={700} color="#92400e" sx={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Wheel Data Key — Common Handoff
                </Typography>
              </Box>
              <TextField
                label="Wheel Data Key *"
                value={form.wheelDataKey}
                onChange={handleChange("wheelDataKey")}
                fullWidth
                required
                helperText="Use a unique reference — Second Zone will select this from a dropdown."
                sx={{ bgcolor: "white", borderRadius: 1 }}
                InputProps={{
                  sx: { fontWeight: 700, fontSize: "1.05rem" },
                }}
              />
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Component Pairs */}
            <SectionHeader label="Component Details" color="#2e7d32" />
            <Stack spacing={2}>
              {pairFields.map(([key, label]) => (
                <ComponentRow
                  key={key}
                  keyName={key}
                  label={label}
                  form={form}
                  handleChange={handleChange}
                />
              ))}
            </Stack>

            <Divider sx={{ my: 3 }} />

            {/* Single make fields */}
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

        {/* Submit */}
        <Box
          sx={{
            display: "flex",
            justifyContent: { xs: "stretch", sm: "flex-end" },
            mb: 4,
          }}
        >
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || !form.projectId}
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
            {saving ? "Saving…" : "Save First Zone Row"}
          </Button>
        </Box>
      </form>

      {/* ── Recent Rows ── */}
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
              No first zone rows for this project yet.
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {rows.slice(0, 10).map((row) => {
                const done = !!row.secondZone?.submittedAt;
                return (
                  <Grid item xs={12} sm={6} key={row._id}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: `1.5px solid ${done ? "#86efac" : "#fcd34d"}`,
                        bgcolor: done ? "#f0fdf4" : "#fffbeb",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Typography sx={{ fontSize: 14, lineHeight: 1 }}>🔑</Typography>
                          <Typography fontWeight={700} fontSize="0.92rem" noWrap>
                            {row.wheelDataKey}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={done ? "✓ 2nd Zone Done" : "⏳ Awaiting 2nd Zone"}
                          color={done ? "success" : "warning"}
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                        />
                      </Box>
                      <Divider />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">TEX No.</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.texNo || "—"}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Wagon No.</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.wagonNo || "—"}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Bogie Make / Serial</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {row.firstZone?.bogie?.make || "—"} /{" "}
                            {(row.firstZone?.bogie?.serialNumbers || []).join(", ") || "—"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}
