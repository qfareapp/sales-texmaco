import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { formatStageDate, inspectionStages } from "./wagonInspectionStageConfig";

// Short label for each stage — used in the mobile count strip
const stageShort = {
  uf_fit_up: "U/F",
  boxing: "Box",
  manipulator_bmp: "BMP",
  reverse_visual: "Rev.",
  top_visual_final_inspection: "Top",
  blasting: "Blast",
  wheeling: "Wheel",
  container_test: "C.Test",
  dm_line: "DM",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, accent = "#374151" }) {
  return (
    <Paper
      elevation={0}
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2,
        border: "1.5px solid #e2e8f0",
        bgcolor: "white",
        borderLeft: `4px solid ${accent}`,
        minWidth: 120,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}
      >
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} color={accent} sx={{ lineHeight: 1.1, mt: 0.25 }}>
        {value}
      </Typography>
    </Paper>
  );
}

// Nine coloured dots showing progress through all stages.
// Green = done, amber ring = active/pending, grey = not started.
function StageDots({ row }) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {inspectionStages.map((stage) => {
        const stageData = (row.inspectionProgress?.stages || []).find((s) => s.key === stage.key);
        const isActive = row.activeStage?.key === stage.key;
        const isDone = !!stageData?.completedOn;
        const tooltipText = isDone
          ? `${stage.label} — ${formatStageDate(stageData.completedOn)}`
          : isActive
          ? `${stage.label} — Pending`
          : stage.label;
        return (
          <Tooltip key={stage.key} title={tooltipText} enterTouchDelay={300}>
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                flexShrink: 0,
                bgcolor: isDone ? "#16a34a" : isActive ? "#b45309" : "#e2e8f0",
                border: isActive ? "2.5px solid #92400e" : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isDone && (
                <Typography sx={{ color: "white", fontSize: "0.58rem", fontWeight: 900, lineHeight: 1 }}>
                  ✓
                </Typography>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// Card shown per wagon on mobile — replaces the wide table
function WagonMobileCard({ row, index, saving, onComplete }) {
  const completedCount = (row.inspectionProgress?.stages || []).filter((s) => s.completedOn).length;
  const allDone = !row.activeStage;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: allDone ? "1.5px solid #86efac" : "1.5px solid #fcd34d",
        bgcolor: allDone ? "#f0fdf4" : "white",
        overflow: "hidden",
      }}
    >
      {/* ── Card header ── */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: allDone ? "#dcfce7" : "#fffbeb",
          borderBottom: `1px solid ${allDone ? "#86efac" : "#fde68a"}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ lineHeight: 1 }}>
            #{row.slNo || index + 1}
          </Typography>
          <Typography fontWeight={800} fontSize="1.05rem" color="#111827">
            {row.texNo || "—"}
          </Typography>
        </Box>
        {allDone ? (
          <Chip
            size="small"
            label="All Stages Done"
            sx={{ bgcolor: "#16a34a", color: "white", fontWeight: 700, fontSize: "0.7rem" }}
          />
        ) : (
          <Chip
            size="small"
            label={`${completedCount} / ${inspectionStages.length} done`}
            sx={{ bgcolor: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: "0.7rem" }}
          />
        )}
      </Box>

      {/* ── Progress dots + current stage ── */}
      <Box sx={{ px: 2, pt: 1.5, pb: row.activeStage ? 0 : 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
            Progress:
          </Typography>
          <StageDots row={row} />
        </Box>

        {row.activeStage && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Current stage:
            </Typography>
            <Chip
              size="small"
              label={row.activeStage.label}
              sx={{ bgcolor: "#fef9c3", color: "#92400e", fontWeight: 700, fontSize: "0.75rem" }}
            />
          </Box>
        )}
      </Box>

      {/* ── Complete CTA ── */}
      {row.activeStage && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Button
            fullWidth
            variant="contained"
            disabled={saving}
            onClick={() => onComplete(row)}
            sx={{
              bgcolor: "#15803d",
              "&:hover": { bgcolor: "#166534" },
              "&:disabled": { bgcolor: "#d1d5db" },
              fontWeight: 700,
              borderRadius: 1.5,
              textTransform: "none",
              py: 1.1,
              fontSize: "0.9rem",
              boxShadow: "0 3px 10px rgba(21,128,61,0.28)",
            }}
          >
            ✓ Mark Complete
          </Button>
        </Box>
      )}
    </Paper>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WagonDataSheetInspectorDashboard() {
  const role = localStorage.getItem("role") || "";
  const submittedByUsername = localStorage.getItem("username") || "";
  const submittedByRole = role;
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dashboard, setDashboard] = useState({ project: null, rows: [], stageCounts: [], stages: inspectionStages });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProjects = async () => {
    const { data } = await api.get("/wagon-data-sheet/projects");
    const nextProjects = data?.data || [];
    setProjects(nextProjects);
    setSelectedProjectId((prev) => prev || nextProjects[0]?._id || "");
  };

  const loadDashboard = async (projectId) => {
    if (!projectId) {
      setDashboard({ project: null, rows: [], stageCounts: [], stages: inspectionStages });
      return;
    }
    const { data } = await api.get(`/wagon-data-sheet/projects/${projectId}/stage-dashboard`);
    setDashboard(data?.data || { project: null, rows: [], stageCounts: [], stages: inspectionStages });
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

  const handleProjectChange = (event) => {
    setSelectedProjectId(event.target.value);
    setError("");
    setSuccess("");
  };

  const handleCompleteStage = async (row) => {
    if (!row?.activeStage?.key) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/wagon-data-sheet/rows/${row._id}/stages/${row.activeStage.key}/complete`, {
        submittedByUsername,
        submittedByRole,
      });
      setSuccess(`${row.texNo || "Selected TEX"} — ${row.activeStage.label} marked complete.`);
      await loadDashboard(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete stage.");
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

  const projectName = dashboard.project?.projectName || "";

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: "auto" }}>

      {/* ── Page Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#15803d",
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>🔧</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Wagon Stage Inspection
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Inspector Workspace
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: { xs: 0, sm: 7 } }}>
        Mark the current pending stage complete. The date is recorded automatically.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* ── Project Selector + Summary ── */}
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, borderRadius: 3, border: "1.5px solid #d1fae5", bgcolor: "#f0fdf4" }}>
        <TextField
          select
          label="Project"
          value={selectedProjectId}
          onChange={handleProjectChange}
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
        <Stack direction="row" spacing={1.5}>
          <StatCard label="TEX Rows" value={dashboard.rows?.length || 0} accent="#15803d" />
          <StatCard label="Pending" value={totalPending} accent={totalPending > 0 ? "#b45309" : "#6b7280"} />
        </Stack>
      </Paper>

      {/* ── Stage Pending Counts ── */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #e5e7eb", overflow: "hidden" }}>
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
          <Typography variant="subtitle2" fontWeight={800} color="#374151">
            Pending Count by Stage
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {/* Mobile: horizontal scroll strip */}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              overflowX: "auto",
              gap: 1,
              pb: 0.5,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {(dashboard.stageCounts || []).map((stage) => {
              const hasPending = (stage.pendingCount || 0) > 0;
              return (
                <Box
                  key={stage.key}
                  sx={{
                    flexShrink: 0,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    textAlign: "center",
                    minWidth: 56,
                    bgcolor: hasPending ? "#fffbeb" : "#f8fafc",
                    border: `1.5px solid ${hasPending ? "#fcd34d" : "#e2e8f0"}`,
                  }}
                >
                  <Typography
                    sx={{
                      display: "block",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      color: hasPending ? "#92400e" : "#94a3b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stageShort[stage.key] || stage.key}
                  </Typography>
                  <Typography fontWeight={800} fontSize="1.15rem" color={hasPending ? "#b45309" : "#9ca3af"} sx={{ lineHeight: 1.1, mt: 0.25 }}>
                    {stage.pendingCount || 0}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Desktop: 5-col grid */}
          <Box
            sx={{
              display: { xs: "none", sm: "grid" },
              gridTemplateColumns: { sm: "1fr 1fr", md: "repeat(5, 1fr)" },
              gap: 1.25,
            }}
          >
            {(dashboard.stageCounts || []).map((stage) => (
              <StatCard
                key={stage.key}
                label={stage.label}
                value={stage.pendingCount || 0}
                accent={(stage.pendingCount || 0) > 0 ? "#b45309" : "#9ca3af"}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* ── Wagon List ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #e5e7eb", overflow: "hidden" }}>

        {/* Section header */}
        <Box
          sx={{
            px: { xs: 2, md: 2.5 },
            py: 1.25,
            bgcolor: "#111827",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} color="white">
            Daily Status{projectName ? ` — ${projectName}` : ""}
          </Typography>
          {dashboard.rows?.length > 0 && (
            <Chip
              size="small"
              label={`${dashboard.rows.length} wagons`}
              sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white", fontWeight: 700, fontSize: "0.7rem" }}
            />
          )}
        </Box>

        {/* ── MOBILE: card stack (xs only) ── */}
        <Box sx={{ display: { xs: "block", sm: "none" }, p: 2 }}>
          {(dashboard.rows || []).length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Typography sx={{ fontSize: 32, mb: 1 }}>🚃</Typography>
              <Typography color="text.secondary" variant="body2">
                No TEX numbers have been added for this project yet.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {(dashboard.rows || []).map((row, index) => (
                <WagonMobileCard
                  key={row._id}
                  row={row}
                  index={index}
                  saving={saving}
                  onComplete={handleCompleteStage}
                />
              ))}
            </Stack>
          )}
        </Box>

        {/* ── DESKTOP: sticky table (sm+) ── */}
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <TableContainer sx={{ maxHeight: "66vh" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", color: "#374151", whiteSpace: "nowrap" }}>SL No.</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", color: "#374151", whiteSpace: "nowrap" }}>TEX No.</TableCell>
                  {inspectionStages.map((stage) => (
                    <TableCell
                      key={stage.key}
                      align="center"
                      sx={{ fontWeight: 700, bgcolor: "#f1f5f9", color: "#374151", minWidth: 120, fontSize: "0.75rem" }}
                    >
                      {stage.label}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#f1f5f9", color: "#374151", minWidth: 180 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Total qty. summary row */}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 800, bgcolor: "#fefce8", color: "#78350f" }}>
                    Total qty. →
                  </TableCell>
                  {inspectionStages.map((stage) => {
                    const count = (dashboard.stageCounts || []).find((item) => item.key === stage.key)?.pendingCount || 0;
                    return (
                      <TableCell
                        key={stage.key}
                        align="center"
                        sx={{ bgcolor: "#fef9c3", fontWeight: 800, color: count > 0 ? "#b45309" : "#6b7280" }}
                      >
                        {count}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ bgcolor: "#fefce8" }} />
                </TableRow>

                {(dashboard.rows || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={inspectionStages.length + 3} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No TEX numbers have been added for this project yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (dashboard.rows || []).map((row, index) => (
                    <TableRow
                      key={row._id}
                      sx={{
                        bgcolor: index % 2 === 0 ? "white" : "#f9fafb",
                        "&:hover": { bgcolor: "#f0fdf4" },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.8rem" }}>{row.slNo || index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{row.texNo || "-"}</TableCell>
                      {inspectionStages.map((stage) => {
                        const stageData = row.inspectionProgress?.stages?.find((item) => item.key === stage.key);
                        const isActive = row.activeStage?.key === stage.key;
                        const isDone = !!stageData?.completedOn;
                        return (
                          <TableCell
                            key={stage.key}
                            align="center"
                            sx={{
                              bgcolor: isActive ? "#fffbeb" : "inherit",
                              fontWeight: isDone ? 700 : 600,
                              color: isDone ? "#166534" : isActive ? "#b45309" : "#d1d5db",
                              fontSize: "0.78rem",
                            }}
                          >
                            {isDone ? formatStageDate(stageData.completedOn) : isActive ? "Pending" : ""}
                          </TableCell>
                        );
                      })}
                      <TableCell align="center">
                        {row.activeStage ? (
                          <Button
                            variant="contained"
                            size="small"
                            disabled={saving}
                            onClick={() => handleCompleteStage(row)}
                            sx={{
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              bgcolor: "#15803d",
                              "&:hover": { bgcolor: "#166534" },
                              borderRadius: 1.5,
                              px: 1.5,
                            }}
                          >
                            ✓ Complete {row.activeStage.label}
                          </Button>
                        ) : (
                          <Chip
                            label="All Stages Done"
                            size="small"
                            sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: "0.72rem" }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

      </Paper>
    </Box>
  );
}
