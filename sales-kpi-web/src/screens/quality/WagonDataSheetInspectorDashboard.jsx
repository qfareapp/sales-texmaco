import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api";
import { buildProjectLabel } from "./wagonDataSheetConfig";
import { formatStageDate, inspectionStages, pdiStages } from "./wagonInspectionStageConfig";

function StatCard({ label, value, accent = "#374151" }) {
  return (
    <Paper
      elevation={0}
      sx={{
        px: 2,
        py: 1.5,
        minWidth: 120,
        borderRadius: 2,
        border: "1.5px solid #e2e8f0",
        bgcolor: "white",
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} color={accent} sx={{ lineHeight: 1.1, mt: 0.25 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function StageTable({
  title,
  rows,
  stages,
  counts,
  actionLabel,
  onComplete,
  saving,
  projectName,
  pdiMode = false,
}) {
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #e5e7eb", overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 1.25, bgcolor: "#111827", color: "white" }}>
        <Typography variant="subtitle2" fontWeight={800}>
          {title}{projectName ? ` "${projectName}"` : ""}
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: "60vh" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>SL No.</TableCell>
              <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>TEX-No.</TableCell>
              {stages.map((stage) => (
                <TableCell key={stage.key} align="center" sx={{ fontWeight: 800, bgcolor: "#f1f5f9", minWidth: 132 }}>
                  {stage.label}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#f1f5f9", minWidth: 170 }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 800, bgcolor: "#fefce8", color: "#78350f" }}>
                Total qty. -&gt;
              </TableCell>
              {stages.map((stage) => {
                const count = (counts || []).find((item) => item.key === stage.key)?.pendingCount || 0;
                return (
                  <TableCell key={stage.key} align="center" sx={{ bgcolor: "#fef9c3", fontWeight: 800, color: count > 0 ? "#b45309" : "#6b7280" }}>
                    {count}
                  </TableCell>
                );
              })}
              <TableCell sx={{ bgcolor: "#fefce8" }} />
            </TableRow>

            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={stages.length + 3} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  {pdiMode
                    ? "PDI status will appear here after wagons reach DM Line."
                    : "Use Create New Wagon Inspection to add the first wagon row for this project."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={`${pdiMode ? "pdi" : "daily"}-${row._id}`} sx={{ bgcolor: index % 2 === 0 ? "white" : "#f9fafb" }}>
                  <TableCell sx={{ fontWeight: 600, color: "#6b7280" }}>{row.slNo || index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{row.texNo || "New Wagon"}</TableCell>
                  {stages.map((stage) => {
                    const stageList = pdiMode ? row.pdiProgress?.stages || [] : row.inspectionProgress?.stages || [];
                    const activeStage = pdiMode ? row.activePdiStage : row.activeStage;
                    const stageData = stageList.find((item) => item.key === stage.key);
                    const isActive = activeStage?.key === stage.key;
                    const isDone = Boolean(stageData?.completedOn);
                    return (
                      <TableCell
                        key={stage.key}
                        align="center"
                        sx={{
                          bgcolor: isActive ? "#fffbeb" : "inherit",
                          color: isDone ? "#166534" : isActive ? "#b45309" : "#d1d5db",
                          fontWeight: isDone ? 700 : 600,
                          fontSize: "0.78rem",
                        }}
                      >
                        {isDone ? formatStageDate(stageData.completedOn) : isActive ? "Pending" : ""}
                      </TableCell>
                    );
                  })}
                  <TableCell align="center">
                    {pdiMode ? (
                      row.activePdiStage ? (
                        <Button
                          variant="contained"
                          size="small"
                          disabled={saving}
                          onClick={() => onComplete(row)}
                          sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#1d4ed8", "&:hover": { bgcolor: "#1e40af" } }}
                        >
                          Complete {row.activePdiStage.label}
                        </Button>
                      ) : row.isPdiActivated ? (
                        <Chip label="PDI Complete" size="small" sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }} />
                      ) : (
                        <Chip label="Not Active" size="small" sx={{ bgcolor: "#f3f4f6", color: "#6b7280", fontWeight: 700 }} />
                      )
                    ) : row.activeStage ? (
                      row.activeStage.key === "dm_line" && row.isPdiActivated ? (
                        <Chip label="Continue in PDI Status" size="small" sx={{ bgcolor: "#fff7ed", color: "#b45309", fontWeight: 800 }} />
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          disabled={saving}
                          onClick={() => onComplete(row)}
                          sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#15803d", "&:hover": { bgcolor: "#166534" } }}
                        >
                          {actionLabel} {row.activeStage.label}
                        </Button>
                      )
                    ) : (
                      <Chip label="All Stages Done" size="small" sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }} />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default function WagonDataSheetInspectorDashboard() {
  const role = localStorage.getItem("role") || "";
  const submittedByUsername = localStorage.getItem("username") || "";
  const submittedByRole = role;

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dashboard, setDashboard] = useState({
    project: null,
    rows: [],
    stageCounts: [],
    pdiStageCounts: [],
    stages: inspectionStages,
    pdiStages,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ufDialogOpen, setUfDialogOpen] = useState(false);
  const [newTexNo, setNewTexNo] = useState("");
  const [selectedUfRow, setSelectedUfRow] = useState(null);

  const loadProjects = async () => {
    const { data } = await api.get("/wagon-data-sheet/projects");
    const nextProjects = data?.data || [];
    setProjects(nextProjects);
    setSelectedProjectId((prev) => prev || nextProjects[0]?._id || "");
  };

  const loadDashboard = async (projectId) => {
    if (!projectId) {
      setDashboard({ project: null, rows: [], stageCounts: [], pdiStageCounts: [], stages: inspectionStages, pdiStages });
      return;
    }
    const { data } = await api.get(`/wagon-data-sheet/projects/${projectId}/stage-dashboard`);
    setDashboard(data?.data || { project: null, rows: [], stageCounts: [], pdiStageCounts: [], stages: inspectionStages, pdiStages });
  };

  useEffect(() => {
    loadProjects().catch(() => setError("Failed to load wagon projects."));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    loadDashboard(selectedProjectId).catch(() => setError("Failed to load project stage dashboard."));
  }, [selectedProjectId]);

  const totalPending = useMemo(
    () => (dashboard.stageCounts || []).reduce((sum, item) => sum + (item.pendingCount || 0), 0),
    [dashboard.stageCounts]
  );
  const totalPdiPending = useMemo(
    () => (dashboard.pdiStageCounts || []).reduce((sum, item) => sum + (item.pendingCount || 0), 0),
    [dashboard.pdiStageCounts]
  );

  const pdiRows = useMemo(
    () => (dashboard.rows || []).filter((row) => row.isPdiActivated),
    [dashboard.rows]
  );

  const handleCreateWagonInspection = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/wagon-data-sheet/rows/stage-entry", { projectId: selectedProjectId });
      setSuccess("New wagon inspection created. Current stage is U/F Fit-Up.");
      await loadDashboard(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create wagon inspection.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteStage = async (row) => {
    if (!row?.activeStage?.key) return;
    if (row.activeStage.key === "uf_fit_up") {
      setSelectedUfRow(row);
      setNewTexNo(row.texNo || "");
      setUfDialogOpen(true);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/wagon-data-sheet/rows/${row._id}/stages/${row.activeStage.key}/complete`, {
        submittedByUsername,
        submittedByRole,
      });
      setSuccess(`${row.texNo || "Selected TEX"} - ${row.activeStage.label} marked complete.`);
      await loadDashboard(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete stage.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartUfFitUp = async () => {
    if (!selectedUfRow?._id) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/wagon-data-sheet/rows/${selectedUfRow._id}/stages/uf_fit_up/complete`, {
        texNo: newTexNo,
        submittedByUsername,
        submittedByRole,
      });
      setSuccess("U/F Fit-Up completed and TEX No. saved.");
      setUfDialogOpen(false);
      setNewTexNo("");
      setSelectedUfRow(null);
      await loadDashboard(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete U/F Fit-Up.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompletePdiStage = async (row) => {
    if (!row?.activePdiStage?.key) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/wagon-data-sheet/rows/${row._id}/pdi-stages/${row.activePdiStage.key}/complete`, {
        submittedByUsername,
        submittedByRole,
      });
      setSuccess(`${row.texNo || "Selected TEX"} - ${row.activePdiStage.label} marked complete.`);
      await loadDashboard(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete PDI stage.");
    } finally {
      setSaving(false);
    }
  };

  if (role !== "ground-inspector") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Stage entry and completion is available only for inspector accounts.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1700, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box sx={{ bgcolor: "#15803d", borderRadius: 2, p: 1, color: "white", fontWeight: 800 }}>I</Box>
        <Box>
          <Typography variant="h5" fontWeight={800}>Wagon Stage Inspection</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Inspector Workspace
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create a new wagon inspection, then complete each daily stage one by one. After DM line is reached, continue in the PDI status section. DM line turns complete only after all PDI stages are done.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 3, border: "1.5px solid #d1fae5", bgcolor: "#f0fdf4" }}>
        <TextField
          select
          label="Project"
          value={selectedProjectId}
          onChange={(event) => {
            setSelectedProjectId(event.target.value);
            setError("");
            setSuccess("");
          }}
          fullWidth
          size="small"
          sx={{ mb: 2, bgcolor: "white", borderRadius: 1 }}
        >
          {projects.map((project) => (
            <MenuItem key={project._id} value={project._id}>
              {buildProjectLabel(project)}
            </MenuItem>
          ))}
        </TextField>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "flex-end" }}>
          <StatCard label="Total Tex Nos" value={dashboard.rows?.length || 0} accent="#15803d" />
          <StatCard label="Daily Pending" value={totalPending} accent={totalPending > 0 ? "#b45309" : "#6b7280"} />
          <StatCard label="PDI Pending" value={totalPdiPending} accent={totalPdiPending > 0 ? "#1d4ed8" : "#6b7280"} />
          <Button
            variant="contained"
            onClick={handleCreateWagonInspection}
            disabled={saving || !selectedProjectId}
            sx={{ minHeight: 56, px: 2.5, textTransform: "none", fontWeight: 800, bgcolor: "#15803d", "&:hover": { bgcolor: "#166534" } }}
          >
            Create New Wagon Inspection
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 3 }}>
        <StageTable
          title="Daily Status"
          rows={dashboard.rows || []}
          stages={inspectionStages}
          counts={dashboard.stageCounts || []}
          actionLabel="Complete"
          onComplete={handleCompleteStage}
          saving={saving}
          projectName={dashboard.project?.projectName || ""}
        />

        <StageTable
          title="BLSS PDI Status"
          rows={pdiRows}
          stages={pdiStages}
          counts={dashboard.pdiStageCounts || []}
          actionLabel="Complete"
          onComplete={handleCompletePdiStage}
          saving={saving}
          projectName={dashboard.project?.projectName || ""}
          pdiMode
        />
      </Box>

      <Dialog open={ufDialogOpen} onClose={() => !saving && setUfDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Complete U/F Fit-Up</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="TEX No."
              value={newTexNo}
              onChange={(event) => setNewTexNo(event.target.value)}
              size="small"
              fullWidth
              autoFocus
            />
            <Typography variant="body2" color="text.secondary">
              Enter the TEX No. and confirm. This marks U/F Fit-Up complete for wagon row #{selectedUfRow?.slNo || "-"}.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUfDialogOpen(false)} color="inherit" disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStartUfFitUp}
            disabled={saving || !newTexNo.trim()}
            sx={{ bgcolor: "#15803d", "&:hover": { bgcolor: "#166534" } }}
          >
            Complete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
