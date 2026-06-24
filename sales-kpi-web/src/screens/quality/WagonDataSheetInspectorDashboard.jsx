import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
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

// Short labels for the mobile stage-count strip
const stageShort = {
  uf_fit_up: "U/F",
  boxing: "Box",
  manipulator_bmp: "BMP",
  reverse_visual: "Rev.",
  top_visual_final_inspection: "Top",
  blasting: "Blast",
  wheeling: "Wheel",
  container_test: "C.T",
  dm_line: "DM",
  weld_visual_clear_by_tpi: "Weld",
  pipe_infringement_clear_by_tpi: "Pipe",
  air_brake_clear_by_tpi: "Air",
  hand_brake_clear_by_tpi: "H.Brk",
  lsd_gap_clear_by_tpi: "LSD",
  coupler_articulation_and_operation: "Coup.",
  apd_pdi_clear_by_tpi: "APD",
  painting_clear_by_tpi: "Paint",
  lettring_clear_by_tpi: "Letr.",
};

// ── Sub-components ────────────────────────────────────────────────────────────

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

// Row of coloured circles showing progress through all stages.
// Green + ✓ = done · Amber ring = active/pending · Grey = not started
function StageDots({ row, stages, pdiMode = false }) {
  const stageList = pdiMode ? row.pdiProgress?.stages || [] : row.inspectionProgress?.stages || [];
  const activeStage = pdiMode ? row.activePdiStage : row.activeStage;
  const activeColor = pdiMode ? "#1d4ed8" : "#b45309";
  const activeBorder = pdiMode ? "#1e40af" : "#92400e";

  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {stages.map((stage) => {
        const stageData = stageList.find((item) => item.key === stage.key);
        const isActive = activeStage?.key === stage.key;
        const isDone = Boolean(stageData?.completedOn);
        return (
          <Box
            key={stage.key}
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: isDone ? "#16a34a" : isActive ? activeColor : "#e5e7eb",
              border: isActive ? `2.5px solid ${activeBorder}` : "2px solid transparent",
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
        );
      })}
    </Box>
  );
}

// Compact mobile card — one wagon, one clear action
function MobileStageCard({ row, index, stages, onComplete, saving, pdiMode = false }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const activeStage = pdiMode ? row.activePdiStage : row.activeStage;
  const stageList = pdiMode ? row.pdiProgress?.stages || [] : row.inspectionProgress?.stages || [];
  const completedCount = stageList.filter((item) => item.completedOn).length;
  const allDone = !activeStage;

  // Special states (Daily mode only)
  const isPdiContinue = !pdiMode && activeStage?.key === "dm_line" && row.isPdiActivated;

  // Theme colours based on mode + state
  const accentColor = pdiMode ? "#1d4ed8" : "#b45309";
  const borderColor = allDone ? "#86efac" : pdiMode ? "#93c5fd" : "#fcd34d";
  const headerBg = allDone ? "#f0fdf4" : pdiMode ? "#eff6ff" : "#fffbeb";
  const stageBg = pdiMode ? "#dbeafe" : "#fef9c3";
  const stageColor = pdiMode ? "#1e40af" : "#92400e";
  const btnBg = pdiMode ? "#1d4ed8" : "#15803d";
  const btnHover = pdiMode ? "#1e40af" : "#166534";

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: `1.5px solid ${borderColor}`,
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
          bgcolor: headerBg,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          {/* SL No. badge */}
          <Box
            sx={{
              minWidth: 26,
              height: 26,
              px: 0.75,
              borderRadius: 1,
              bgcolor: allDone ? "#15803d" : accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ color: "white", fontSize: "0.68rem", fontWeight: 900, lineHeight: 1 }}>
              {row.slNo || index + 1}
            </Typography>
          </Box>
          <Typography fontWeight={800} fontSize="1.02rem" color="#111827">
            {row.texNo || `Wagon #${row.slNo || index + 1}`}
          </Typography>
        </Box>

        {allDone ? (
          <Chip
            size="small"
            label={pdiMode ? "PDI Done ✓" : "All Done ✓"}
            sx={{ bgcolor: "#16a34a", color: "white", fontWeight: 700, fontSize: "0.7rem" }}
          />
        ) : (
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            {completedCount}/{stages.length} done
          </Typography>
        )}
      </Box>

      {/* ── Progress dots ── */}
      <Box sx={{ px: 2, pt: 1.5, pb: 0.75 }}>
        <StageDots row={row} stages={stages} pdiMode={pdiMode} />
      </Box>

      {/* ── Current stage + CTA ── */}
      <Box sx={{ px: 2, pb: 1.75 }}>
        {isPdiContinue ? (
          <Box
            sx={{
              mt: 0.5,
              px: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: "#eff6ff",
              border: "1.5px solid #93c5fd",
              textAlign: "center",
            }}
          >
            <Typography variant="body2" fontWeight={800} color="#1e40af">
              ↓ Continue in PDI Status below
            </Typography>
            <Typography variant="caption" color="#3b82f6" sx={{ display: "block", mt: 0.25 }}>
              DM Line closes after all PDI stages are cleared.
            </Typography>
          </Box>
        ) : activeStage ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Next stage:
              </Typography>
              <Chip
                size="small"
                label={activeStage.label}
                sx={{ bgcolor: stageBg, color: stageColor, fontWeight: 700, fontSize: "0.75rem" }}
              />
            </Box>
            <Button
              fullWidth
              variant="contained"
              disabled={saving}
              onClick={() => onComplete(row)}
              sx={{
                bgcolor: btnBg,
                "&:hover": { bgcolor: btnHover },
                "&:disabled": { bgcolor: "#d1d5db" },
                fontWeight: 800,
                borderRadius: 2,
                textTransform: "none",
                py: 1.3,
                fontSize: "0.92rem",
                boxShadow: `0 4px 14px ${pdiMode ? "rgba(29,78,216,0.28)" : "rgba(21,128,61,0.3)"}`,
              }}
            >
              ✓ Complete {activeStage.label}
            </Button>
          </>
        ) : null}
      </Box>

      {/* ── Collapsible stage history ── */}
      <Box sx={{ borderTop: `1px dashed ${borderColor}` }}>
        <Button
          fullWidth
          size="small"
          onClick={() => setHistoryOpen((v) => !v)}
          sx={{
            py: 0.75,
            color: "text.secondary",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 0,
          }}
        >
          {historyOpen ? "▲ Hide stage history" : "▼ View stage history"}
        </Button>
        <Collapse in={historyOpen}>
          <Stack spacing={0.6} sx={{ px: 2, pb: 2 }}>
            {stages.map((stage) => {
              const stageData = stageList.find((s) => s.key === stage.key);
              const isActive = activeStage?.key === stage.key;
              const isDone = Boolean(stageData?.completedOn);
              return (
                <Box
                  key={stage.key}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    px: 1.25,
                    py: 0.85,
                    borderRadius: 1.5,
                    bgcolor: isActive ? "#fff7ed" : isDone ? "#f0fdf4" : "#f8fafc",
                    border: `1px solid ${isActive ? "#fdba74" : isDone ? "#86efac" : "#e5e7eb"}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        flexShrink: 0,
                        bgcolor: isDone ? "#16a34a" : isActive ? accentColor : "#d1d5db",
                      }}
                    />
                    <Typography variant="caption" fontWeight={700} color={isDone ? "text.primary" : "text.secondary"}>
                      {stage.label}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    sx={{ whiteSpace: "nowrap", color: isDone ? "#166534" : isActive ? accentColor : "#d1d5db" }}
                  >
                    {isDone ? formatStageDate(stageData.completedOn) : isActive ? "Pending" : "—"}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Collapse>
      </Box>
    </Paper>
  );
}

// ── StageTable: renders mobile cards + desktop sticky table ───────────────────

function StageTable({ title, rows, stages, counts, actionLabel, onComplete, saving, projectName, pdiMode = false }) {
  const accentColor = pdiMode ? "#1d4ed8" : "#15803d";
  const pendingColor = pdiMode ? "#1d4ed8" : "#b45309";

  return (
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
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: accentColor,
            flexShrink: 0,
          }}
        />
        <Typography variant="subtitle2" fontWeight={800} color="white">
          {title}{projectName ? ` — ${projectName}` : ""}
        </Typography>
        {rows.length > 0 && (
          <Chip
            size="small"
            label={`${rows.length} wagons`}
            sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white", fontWeight: 700, fontSize: "0.68rem" }}
          />
        )}
      </Box>

      {/* ── MOBILE: count strip + card stack ── */}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>

        {/* Horizontal stage count strip */}
        {(counts || []).length > 0 && (
          <Box
            sx={{
              display: "flex",
              overflowX: "auto",
              gap: 1,
              px: 2,
              pt: 1.5,
              pb: 1,
              WebkitOverflowScrolling: "touch",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            {(counts || []).map((stage) => {
              const hasPending = (stage.pendingCount || 0) > 0;
              return (
                <Box
                  key={stage.key}
                  sx={{
                    flexShrink: 0,
                    textAlign: "center",
                    minWidth: 48,
                    px: 1,
                    py: 0.75,
                    borderRadius: 1.5,
                    bgcolor: hasPending ? (pdiMode ? "#dbeafe" : "#fffbeb") : "#f8fafc",
                    border: `1.5px solid ${hasPending ? (pdiMode ? "#93c5fd" : "#fcd34d") : "#e2e8f0"}`,
                  }}
                >
                  <Typography
                    sx={{
                      display: "block",
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      color: hasPending ? (pdiMode ? "#1e40af" : "#92400e") : "#94a3b8",
                      lineHeight: 1,
                    }}
                  >
                    {stageShort[stage.key] || stage.label.slice(0, 5)}
                  </Typography>
                  <Typography
                    fontWeight={800}
                    fontSize="1.05rem"
                    color={hasPending ? pendingColor : "#9ca3af"}
                    sx={{ lineHeight: 1.2, mt: 0.3 }}
                  >
                    {stage.pendingCount || 0}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Wagon cards */}
        <Box sx={{ p: 2 }}>
          {rows.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Typography sx={{ fontSize: 28, mb: 1 }}>🚃</Typography>
              <Typography variant="body2" color="text.secondary">
                {pdiMode
                  ? "PDI status will appear here once wagons reach the DM Line stage."
                  : "Use "Create New Wagon Inspection" above to add the first wagon for this project."}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {rows.map((row, index) => (
                <MobileStageCard
                  key={`${pdiMode ? "pdi-m" : "daily-m"}-${row._id}`}
                  row={row}
                  index={index}
                  stages={stages}
                  onComplete={onComplete}
                  saving={saving}
                  pdiMode={pdiMode}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Box>

      {/* ── DESKTOP: sticky table (sm+) ── */}
      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <TableContainer sx={{ maxHeight: "60vh" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", color: "#374151" }}>SL No.</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", color: "#374151" }}>TEX No.</TableCell>
                {stages.map((stage) => (
                  <TableCell
                    key={stage.key}
                    align="center"
                    sx={{ fontWeight: 700, bgcolor: "#f1f5f9", color: "#374151", minWidth: 132, fontSize: "0.75rem" }}
                  >
                    {stage.label}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{ fontWeight: 800, bgcolor: "#f1f5f9", color: "#374151", minWidth: 170 }}
                >
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
                {stages.map((stage) => {
                  const count = (counts || []).find((item) => item.key === stage.key)?.pendingCount || 0;
                  return (
                    <TableCell
                      key={stage.key}
                      align="center"
                      sx={{ bgcolor: "#fef9c3", fontWeight: 800, color: count > 0 ? pendingColor : "#6b7280" }}
                    >
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
                  <TableRow
                    key={`${pdiMode ? "pdi" : "daily"}-${row._id}`}
                    sx={{
                      bgcolor: index % 2 === 0 ? "white" : "#f9fafb",
                      "&:hover": { bgcolor: pdiMode ? "#eff6ff" : "#f0fdf4" },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: "#6b7280", fontSize: "0.8rem" }}>
                      {row.slNo || index + 1}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: "0.85rem" }}>
                      {row.texNo || "New Wagon"}
                    </TableCell>
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
                            bgcolor: isActive ? (pdiMode ? "#eff6ff" : "#fffbeb") : "inherit",
                            color: isDone ? "#166534" : isActive ? pendingColor : "#d1d5db",
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
                            sx={{
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              bgcolor: "#1d4ed8",
                              "&:hover": { bgcolor: "#1e40af" },
                              borderRadius: 1.5,
                            }}
                          >
                            {actionLabel} {row.activePdiStage.label}
                          </Button>
                        ) : row.isPdiActivated ? (
                          <Chip
                            label="PDI Complete"
                            size="small"
                            sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }}
                          />
                        ) : (
                          <Chip
                            label="Not Active"
                            size="small"
                            sx={{ bgcolor: "#f3f4f6", color: "#6b7280", fontWeight: 700 }}
                          />
                        )
                      ) : row.activeStage ? (
                        row.activeStage.key === "dm_line" && row.isPdiActivated ? (
                          <Chip
                            label="Continue in PDI Status"
                            size="small"
                            sx={{ bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 800 }}
                          />
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            disabled={saving}
                            onClick={() => onComplete(row)}
                            sx={{
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              bgcolor: "#15803d",
                              "&:hover": { bgcolor: "#166534" },
                              borderRadius: 1.5,
                            }}
                          >
                            {actionLabel} {row.activeStage.label}
                          </Button>
                        )
                      ) : (
                        <Chip
                          label="All Stages Done"
                          size="small"
                          sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }}
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
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

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
      setSuccess(`${row.texNo || "Selected TEX"} — ${row.activeStage.label} marked complete.`);
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
      setSuccess(`${row.texNo || "Selected TEX"} — ${row.activePdiStage.label} marked complete.`);
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
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: "uppercase", letterSpacing: 1 }}
          >
            Inspector Workspace
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: { xs: 0, sm: 7 } }}>
        Complete each daily stage one by one. After DM Line, continue in the PDI Status section. DM Line closes only after all PDI stages are cleared.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* ── Project selector + summary ── */}
      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 3, borderRadius: 3, border: "1.5px solid #d1fae5", bgcolor: "#f0fdf4" }}>
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
          <StatCard label="Total TEX Nos" value={dashboard.rows?.length || 0} accent="#15803d" />
          <StatCard
            label="Daily Pending"
            value={totalPending}
            accent={totalPending > 0 ? "#b45309" : "#6b7280"}
          />
          <StatCard
            label="PDI Pending"
            value={totalPdiPending}
            accent={totalPdiPending > 0 ? "#1d4ed8" : "#6b7280"}
          />
          <Button
            variant="contained"
            onClick={handleCreateWagonInspection}
            disabled={saving || !selectedProjectId}
            sx={{
              minHeight: { xs: 48, sm: 56 },
              px: 2.5,
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.9rem",
              borderRadius: 2,
              bgcolor: "#15803d",
              "&:hover": { bgcolor: "#166534" },
              "&:disabled": { bgcolor: "#d1d5db" },
              boxShadow: "0 3px 10px rgba(21,128,61,0.3)",
              width: { xs: "100%", sm: "auto" },
            }}
          >
            + Create New Wagon Inspection
          </Button>
        </Stack>
      </Paper>

      {/* ── Daily Status + PDI Status sections ── */}
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

      {/* ── U/F Fit-Up TEX entry dialog ── */}
      <Dialog open={ufDialogOpen} onClose={() => !saving && setUfDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Complete U/F Fit-Up</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="TEX No."
              value={newTexNo}
              onChange={(event) => setNewTexNo(event.target.value)}
              size="small"
              fullWidth
              autoFocus
              placeholder="e.g. B-94"
            />
            <Typography variant="body2" color="text.secondary">
              Enter the TEX No. to assign to wagon row{" "}
              <strong>#{selectedUfRow?.slNo || "—"}</strong>, then confirm to mark U/F Fit-Up complete.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setUfDialogOpen(false)}
            color="inherit"
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStartUfFitUp}
            disabled={saving || !newTexNo.trim()}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              bgcolor: "#15803d",
              "&:hover": { bgcolor: "#166534" },
              borderRadius: 1.5,
              px: 3,
            }}
          >
            {saving ? "Saving…" : "Confirm & Complete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
