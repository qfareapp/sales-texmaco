import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
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
  Tooltip,
  Typography,
} from "@mui/material";
import api from "../../api";
import { buildProjectLabel } from "./wagonDataSheetConfig";
import {
  formatStageDate,
  inspectionStages,
  pdiStages,
  stageStatusLabel,
  stageStatusPalette,
} from "./wagonInspectionStageConfig";

function CountChip({ label, value, bg, color }) {
  return <Chip label={`${label}: ${value || 0}`} sx={{ bgcolor: bg, color, fontWeight: 800 }} />;
}

const formatStageTime = (value) => {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

function CompletedStageTooltip({ stageData, onReset, resetting = false }) {
  const username = stageData?.completedBy?.username || "Unknown inspector";
  const role = stageData?.completedBy?.role || "Unknown role";
  const completedDate = formatStageDate(stageData?.completedOn);
  const completedTime = formatStageTime(stageData?.completedAt);

  return (
    <Tooltip
      arrow
      placement="top"
      enterTouchDelay={0}
      leaveTouchDelay={3000}
      title={
        <Box sx={{ py: 0.5 }}>
          <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "inherit" }}>
            Inspector: {username}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "inherit" }}>
            Role: {role}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "inherit" }}>
            Completed: {completedDate || "Date unavailable"} at {completedTime}
          </Typography>
        </Box>
      }
    >
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          width: "100%",
          cursor: "help",
          WebkitTouchCallout: "none",
        }}
      >
        <Box component="span">{stageStatusLabel(stageData)}</Box>
        {onReset ? (
          <Box
            component="button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onReset();
            }}
            disabled={resetting}
            title="Reset to pending"
            sx={{
              border: "none",
              background: "transparent",
              color: "#b91c1c",
              fontSize: "0.65rem",
              lineHeight: 1,
              p: 0,
              minWidth: "auto",
              cursor: resetting ? "wait" : "pointer",
            }}
          >
            {resetting ? <CircularProgress size={10} thickness={6} color="inherit" /> : "↺"}
          </Box>
        ) : null}
      </Box>
    </Tooltip>
  );
}

function ReadOnlyStageTable({ title, rows, stages, counts, projectName, pdiMode = false, onResetStage, resettingStageKey }) {
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
                Current Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 800, bgcolor: "#fefce8", color: "#78350f" }}>
                Total pending -&gt;
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
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 800, bgcolor: "#ecfdf5", color: "#166534" }}>
                Total completed -&gt;
              </TableCell>
              {stages.map((stage) => {
                const count = (counts || []).find((item) => item.key === stage.key)?.completedCount || 0;
                return (
                  <TableCell key={stage.key} align="center" sx={{ bgcolor: "#dcfce7", fontWeight: 800, color: count > 0 ? "#15803d" : "#6b7280" }}>
                    {count}
                  </TableCell>
                );
              })}
              <TableCell sx={{ bgcolor: "#ecfdf5" }} />
            </TableRow>

            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={stages.length + 3} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  {pdiMode ? "PDI status will appear here after wagons reach DM Line." : "No wagon inspections found for this project yet."}
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
                    const palette = stageStatusPalette(stageData, isActive, pdiMode);
                    return (
                      <TableCell
                        key={stage.key}
                        align="center"
                        sx={{
                          bgcolor: palette.bg,
                          color: palette.text,
                          fontWeight: stageData?.status ? 700 : 600,
                          fontSize: "0.78rem",
                        }}
                      >
                        {stageData?.status === "completed" ? (
                          <CompletedStageTooltip
                            stageData={stageData}
                            onReset={() => onResetStage?.(row._id, stage.key, pdiMode)}
                            resetting={resettingStageKey === `${pdiMode ? "pdi" : "daily"}:${row._id}:${stage.key}`}
                          />
                        ) : stageData ? stageStatusLabel(stageData) : ""}
                      </TableCell>
                    );
                  })}
                  <TableCell align="center">
                    {pdiMode ? (
                      row.activePdiStage ? (
                        <Chip label={`Pending: ${row.activePdiStage.label}`} size="small" sx={{ bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 800 }} />
                      ) : row.pdiProgress?.stages?.some((stage) => stage.status === "skipped") ? (
                        <Chip label="Skipped stages pending" size="small" sx={{ bgcolor: "#ffedd5", color: "#c2410c", fontWeight: 800 }} />
                      ) : row.isPdiActivated ? (
                        <Chip label="PDI Complete" size="small" sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }} />
                      ) : (
                        <Chip label="Not Active" size="small" sx={{ bgcolor: "#f3f4f6", color: "#6b7280", fontWeight: 700 }} />
                      )
                    ) : row.activeStage ? (
                      row.activeStage.key === "dm_line" && row.isPdiActivated ? (
                        <Chip label="Pending in PDI" size="small" sx={{ bgcolor: "#fff7ed", color: "#b45309", fontWeight: 800 }} />
                      ) : (
                        <Chip label={`Pending: ${row.activeStage.label}`} size="small" sx={{ bgcolor: "#fff7ed", color: "#b45309", fontWeight: 800 }} />
                      )
                    ) : row.inspectionProgress?.stages?.some((stage) => stage.status === "skipped") ? (
                      <Chip label="Skipped stages pending" size="small" sx={{ bgcolor: "#ffedd5", color: "#c2410c", fontWeight: 800 }} />
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

export default function WagonDataSheetAdminDashboard() {
  const role = localStorage.getItem("role") || "";
  const isQualityModuleAdmin = role === "admin" || role === "quality-admin";
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
  const [error, setError] = useState("");
  const [resettingStageKey, setResettingStageKey] = useState("");
  const [resetTarget, setResetTarget] = useState(null);

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
    loadDashboard(selectedProjectId).catch(() => setError("Failed to load project dashboard."));
  }, [selectedProjectId]);

  const handleResetStage = (rowId, stageKey, pdiMode = false) => {
    setResetTarget({ rowId, stageKey, pdiMode });
  };

  const confirmResetStage = async () => {
    if (!selectedProjectId || !resetTarget) return;
    const { rowId, stageKey, pdiMode } = resetTarget;
    const requestKey = `${pdiMode ? "pdi" : "daily"}:${rowId}:${stageKey}`;
    setResettingStageKey(requestKey);
    setError("");
    try {
      const path = pdiMode
        ? `/wagon-data-sheet/rows/${rowId}/pdi-stages/${stageKey}/reset`
        : `/wagon-data-sheet/rows/${rowId}/stages/${stageKey}/reset`;
      await api.patch(path, {
        submittedByUsername: localStorage.getItem("username") || "admin",
        submittedByRole: role,
      });
      await loadDashboard(selectedProjectId);
      setResetTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset stage.");
    } finally {
      setResettingStageKey("");
    }
  };

  const totals = useMemo(() => {
    const dailyPending = (dashboard.stageCounts || []).reduce((sum, item) => sum + (item.pendingCount || 0), 0);
    const pdiPending = (dashboard.pdiStageCounts || []).reduce((sum, item) => sum + (item.pendingCount || 0), 0);
    const completed = (dashboard.rows || []).filter((row) => row.isFullyCompleted).length;
    return { dailyPending, pdiPending, completed };
  }, [dashboard]);

  const pdiRows = useMemo(
    () => (dashboard.rows || []).filter((row) => row.isPdiActivated),
    [dashboard.rows]
  );

  if (!isQualityModuleAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">This Wagon Data Sheet dashboard is available only for quality admin accounts.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1700, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box sx={{ bgcolor: "#1d4ed8", borderRadius: 2, p: 1, color: "white", fontWeight: 800 }}>A</Box>
        <Box>
          <Typography variant="h5" fontWeight={800}>Wagon Data Sheet Dashboard</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Admin View
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review Daily Status and BLSS PDI Status project-wise. DM line remains pending until the last PDI stage is completed.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 3, border: "1.5px solid #dbeafe", bgcolor: "#f8fbff" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <TextField
            select
            label="Project"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            fullWidth
            size="small"
          >
            {projects.map((project) => (
              <MenuItem key={project._id} value={project._id}>
                {buildProjectLabel(project)}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <CountChip label="TEX Rows" value={dashboard.rows?.length || 0} bg="#e0f2fe" color="#075985" />
            <CountChip label="Daily Pending" value={totals.dailyPending} bg="#ffedd5" color="#9a3412" />
            <CountChip label="PDI Pending" value={totals.pdiPending} bg="#dbeafe" color="#1d4ed8" />
            <CountChip label="Done" value={totals.completed} bg="#dcfce7" color="#166534" />
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 3 }}>
        <ReadOnlyStageTable
          title="Daily Status"
          rows={dashboard.rows || []}
          stages={inspectionStages}
          counts={dashboard.stageCounts || []}
          projectName={dashboard.project?.projectName || ""}
          onResetStage={handleResetStage}
          resettingStageKey={resettingStageKey}
        />

        <ReadOnlyStageTable
          title="PDI Status"
          rows={pdiRows}
          stages={pdiStages}
          counts={dashboard.pdiStageCounts || []}
          projectName=""
          pdiMode
          onResetStage={handleResetStage}
          resettingStageKey={resettingStageKey}
        />
      </Box>

      <Dialog open={Boolean(resetTarget)} onClose={() => !resettingStageKey && setResetTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Completed Stage?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will change the completed stage back to pending. Later linked stages may also be reopened.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Chip
            label="Cancel"
            onClick={() => setResetTarget(null)}
            sx={{ cursor: resettingStageKey ? "default" : "pointer", opacity: resettingStageKey ? 0.6 : 1 }}
          />
          <Chip
            label={resettingStageKey ? "Resetting..." : "Yes, Reset"}
            onClick={() => !resettingStageKey && confirmResetStage()}
            sx={{ bgcolor: "#fee2e2", color: "#b91c1c", fontWeight: 700, cursor: resettingStageKey ? "default" : "pointer" }}
          />
        </DialogActions>
      </Dialog>
    </Box>
  );
}
