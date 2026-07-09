import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  formatStageDate,
  inspectionStages,
  pdiStages,
  stageStatusLabel,
  stageStatusPalette,
} from "./wagonInspectionStageConfig";

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

const getStageState = (row, pdiMode = false) => {
  const stageList = pdiMode ? row.pdiProgress?.stages || [] : row.inspectionProgress?.stages || [];
  const activeStage = pdiMode ? row.activePdiStage : row.activeStage;
  const skippedStages = stageList.filter((stage) => stage.status === "skipped");
  const completedCount = stageList.filter((stage) => stage.status === "completed").length;
  const isComplete = pdiMode ? row.isPdiCompleted : row.isFullyCompleted;
  return {
    stageList,
    activeStage,
    skippedStages,
    completedCount,
    isComplete,
  };
};

const canTemporarilySkipStage = (stage) => Boolean(stage) && stage.key !== "uf_fit_up";

// -- Sub-components -------------------------------------------------------------

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
                ?
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function StageDotsStatus({ row, stages, pdiMode = false }) {
  const { stageList, activeStage } = getStageState(row, pdiMode);
  const activeBorder = pdiMode ? "#1e40af" : "#92400e";

  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {stages.map((stage) => {
        const stageData = stageList.find((item) => item.key === stage.key);
        const isActive = activeStage?.key === stage.key;
        const palette = stageStatusPalette(stageData, isActive, pdiMode);
        return (
          <Box
            key={stage.key}
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: palette.dot,
              border: isActive ? `2.5px solid ${activeBorder}` : `2px solid ${palette.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {stageData?.status === "skipped" && (
              <Typography sx={{ color: "white", fontSize: "0.72rem", fontWeight: 900, lineHeight: 1 }}>
                !
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// Slide-to-complete: drag the thumb right to confirm action
function SlideToComplete({ label, onComplete, disabled, color = "#15803d" }) {
  const trackRef = useRef(null);
  const startXRef = useRef(0);
  const maxTravelRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const THUMB = 44;

  const onDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    maxTravelRef.current = trackRef.current
      ? trackRef.current.getBoundingClientRect().width - THUMB - 8
      : 200;
    setDragging(true);
  };

  const onMove = (e) => {
    if (!dragging) return;
    const travel = Math.max(0, Math.min(e.clientX - startXRef.current, maxTravelRef.current));
    setDragX(travel);
  };

  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX >= maxTravelRef.current * 0.82) {
      onComplete();
    }
    setDragX(0);
  };

  const progress = maxTravelRef.current > 0 ? dragX / maxTravelRef.current : 0;
  const snap = "0.25s cubic-bezier(0.34,1.56,0.64,1)";

  return (
    <Box
      ref={trackRef}
      sx={{
        position: "relative",
        height: 52,
        borderRadius: 26,
        bgcolor: "#f1f5f9",
        border: `1.5px solid ${disabled ? "#d1d5db" : color}`,
        overflow: "hidden",
        userSelect: "none",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {/* Colored fill that grows with drag */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: dragX + THUMB + 4,
          minWidth: THUMB + 4,
          bgcolor: color,
          borderRadius: "inherit",
          transition: dragging ? "none" : `width ${snap}`,
        }}
      />

      {/* Centered label — shifts color once fill covers it */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          pl: `${THUMB + 12}px`,
          pr: 2,
        }}
      >
        <Typography
          fontWeight={800}
          fontSize="0.83rem"
          letterSpacing={0.3}
          noWrap
          sx={{ color: progress > 0.4 ? "rgba(255,255,255,0.95)" : "#374151", transition: "color 0.15s" }}
        >
          {label}
        </Typography>
      </Box>

      {/* Draggable thumb circle */}
      <Box
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        sx={{
          position: "absolute",
          left: 4 + dragX,
          top: 4,
          width: THUMB,
          height: THUMB,
          borderRadius: "50%",
          bgcolor: "white",
          boxShadow: dragging ? "0 4px 18px rgba(0,0,0,0.22)" : "0 2px 8px rgba(0,0,0,0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "grab",
          touchAction: "none",
          transition: dragging ? "none" : `left ${snap}`,
          zIndex: 2,
          "&:active": { cursor: "grabbing" },
        }}
      >
        <Typography sx={{ color, fontSize: "1.05rem", letterSpacing: -2, lineHeight: 1, fontWeight: 900, mt: "1px" }}>
          ›››
        </Typography>
      </Box>
    </Box>
  );
}

// Mobile card — compact with single CTA + collapsible history
function MobileStageCard({ row, index, stages, onComplete, onSkip, saving, pdiMode = false, onGoToPdi, highlighted = false }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [skippedOpen, setSkippedOpen] = useState(false);

  const { activeStage, stageList, completedCount, skippedStages, isComplete } = getStageState(row, pdiMode);
  const allDone = isComplete;
  const isPdiContinue = !pdiMode && activeStage?.key === "dm_line" && row.isPdiActivated && !row.isPdiCompleted;

  const accentColor = pdiMode ? "#1d4ed8" : "#b45309";
  const borderColor = highlighted
    ? "#1d4ed8"
    : allDone
    ? "#86efac"
    : pdiMode
    ? "#93c5fd"
    : "#fcd34d";
  const headerBg = allDone ? "#f0fdf4" : pdiMode ? "#eff6ff" : "#fffbeb";
  const stageBg = pdiMode ? "#dbeafe" : "#fef9c3";
  const stageColor = pdiMode ? "#1e40af" : "#92400e";
  const btnBg = pdiMode ? "#1d4ed8" : "#15803d";
  const btnHover = pdiMode ? "#1e40af" : "#166534";
  const backBorder = pdiMode ? "#60a5fa" : "#f59e0b";
  const backText = pdiMode ? "#1d4ed8" : "#b45309";

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: `${highlighted ? "2px" : "1.5px"} solid ${borderColor}`,
        bgcolor: allDone ? "#f0fdf4" : "white",
        overflow: "hidden",
        ...(highlighted && {
          animation: "highlightPulse 0.9s ease 3",
          "@keyframes highlightPulse": {
            "0%, 100%": { boxShadow: "none" },
            "50%": { boxShadow: "0 0 0 5px rgba(29,78,216,0.25)" },
          },
        }),
      }}
    >
      {/* -- Card header -- */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: highlighted ? "#eff6ff" : headerBg,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              minWidth: 26,
              height: 26,
              px: 0.75,
              borderRadius: 1,
              bgcolor: highlighted ? "#1d4ed8" : allDone ? "#15803d" : accentColor,
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
            label={pdiMode ? "PDI Done ?" : "All Done ?"}
            sx={{ bgcolor: "#16a34a", color: "white", fontWeight: 700, fontSize: "0.7rem" }}
          />
        ) : (
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            {completedCount}/{stages.length} done
          </Typography>
        )}
      </Box>

      {/* -- Progress dots -- */}
      <Box sx={{ px: 2, pt: 1.5, pb: 0.75 }}>
        <StageDotsStatus row={row} stages={stages} pdiMode={pdiMode} />
      </Box>

      {/* -- Current stage + CTA -- */}
      <Box sx={{ px: 2, pb: 1.75 }}>
        {isPdiContinue ? (
          /* Wagon reached DM Line — direct link to PDI tab */
          <>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => onGoToPdi?.(row._id)}
            sx={{
              mt: 0.5,
              borderColor: "#93c5fd",
              color: "#1d4ed8",
              fontWeight: 800,
              borderRadius: 2,
              textTransform: "none",
              py: 1.1,
              fontSize: "0.88rem",
              "&:hover": { borderColor: "#1d4ed8", bgcolor: "#eff6ff" },
            }}
          >
            ? Open {row.texNo || "this wagon"} in PDI Status
          </Button>
          {skippedStages.length > 0 && (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setSkippedOpen((value) => !value)}
              disabled={saving}
              sx={{
                mt: 1,
                borderColor: backBorder,
                color: backText,
                fontWeight: 800,
                borderRadius: 2,
                textTransform: "none",
                py: 1,
                "&:hover": { borderColor: backText, bgcolor: pdiMode ? "#eff6ff" : "#fffbeb" },
              }}
            >
              {skippedOpen ? "Hide Back Stages" : `Back to Skipped (${skippedStages.length})`}
            </Button>
          )}
          </>
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
            <SlideToComplete
              label="Slide to complete"
              onComplete={() => onComplete(row, activeStage)}
              disabled={saving}
              color={btnBg}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1.1 }}>
              {canTemporarilySkipStage(activeStage) && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => onSkip(row, activeStage)}
                  disabled={saving}
                  sx={{
                    bgcolor: "#ea580c",
                    "&:hover": { bgcolor: "#c2410c" },
                    color: "white",
                    fontWeight: 800,
                    textTransform: "none",
                    borderRadius: 2,
                    py: 1,
                  }}
                >
                  Skip
                </Button>
              )}
              {skippedStages.length > 0 && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setSkippedOpen((value) => !value)}
                  disabled={saving}
                  sx={{
                    borderColor: backBorder,
                    color: backText,
                    fontWeight: 800,
                    textTransform: "none",
                    borderRadius: 2,
                    py: 1,
                    "&:hover": { borderColor: backText, bgcolor: pdiMode ? "#eff6ff" : "#fffbeb" },
                  }}
                >
                  {skippedOpen ? "Close Back" : "Back"}
                </Button>
              )}
            </Stack>
          </>
        ) : skippedStages.length ? (
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setSkippedOpen((value) => !value)}
            disabled={saving}
            sx={{
              borderColor: backBorder,
              color: backText,
              fontWeight: 800,
              textTransform: "none",
              borderRadius: 2,
              py: 1,
              "&:hover": { borderColor: backText, bgcolor: pdiMode ? "#eff6ff" : "#fffbeb" },
            }}
          >
            {skippedOpen ? "Hide Back Stages" : `Back to Skipped (${skippedStages.length})`}
          </Button>
        ) : null}
        {skippedOpen && skippedStages.length > 0 && (
          <Stack spacing={1} sx={{ mt: 1.25 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Re-fill skipped stages
            </Typography>
            {skippedStages.map((stage) => {
              const stagePalette = stageStatusPalette(stage, false, pdiMode);
              return (
                <Button
                  key={`skipped-${stage.key}`}
                  variant="outlined"
                  onClick={() => onComplete(row, stage)}
                  disabled={saving}
                  sx={{
                    justifyContent: "space-between",
                    textTransform: "none",
                    borderColor: stagePalette.border,
                    color: stagePalette.text,
                    bgcolor: stagePalette.bg,
                    fontWeight: 800,
                    borderRadius: 2,
                    py: 1,
                    px: 1.25,
                    "&:hover": { borderColor: stagePalette.text, bgcolor: stagePalette.bg },
                  }}
                >
                  <span>{stage.label}</span>
                  <span>Complete</span>
                </Button>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* -- Collapsible stage history -- */}
      <Box sx={{ borderTop: `1px dashed ${borderColor}` }}>
        <Button
          fullWidth
          size="small"
          onClick={() => setHistoryOpen((v) => !v)}
          sx={{ py: 0.75, color: "text.secondary", fontSize: "0.75rem", fontWeight: 600, textTransform: "none", borderRadius: 0 }}
        >
          {historyOpen ? "? Hide stage history" : "? View stage history"}
        </Button>
        <Collapse in={historyOpen}>
          <Stack spacing={0.6} sx={{ px: 2, pb: 2 }}>
            {stages.map((stage) => {
              const stageData = stageList.find((s) => s.key === stage.key);
              const isActive = activeStage?.key === stage.key;
              const palette = stageStatusPalette(stageData, isActive, pdiMode);
              const isDone = stageData?.status === "completed";
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
                    bgcolor: palette.bg,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        flexShrink: 0,
                        bgcolor: palette.dot,
                      }}
                    />
                    <Typography variant="caption" fontWeight={700} color={stageData?.status ? "text.primary" : "text.secondary"}>
                      {stage.label}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    sx={{ whiteSpace: "nowrap", color: palette.text }}
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

// -- StageTable: content only (no outer Paper — lives inside the tabbed Paper) --

function StageTable({ rows, stages, counts, actionLabel, onComplete, onSkip, saving, projectName, pdiMode = false, onGoToPdi, highlightedId }) {
  const pendingColor = pdiMode ? "#1d4ed8" : "#b45309";

  return (
    <>
      {/* Project name + count info bar */}
      {projectName && (
        <Box
          sx={{
            px: { xs: 2, md: 2.5 },
            py: 1,
            bgcolor: "#f8fafc",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {projectName}
          </Typography>
          <Chip
            size="small"
            label={`${rows.length} wagon${rows.length === 1 ? "" : "s"}`}
            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#e2e8f0", color: "#374151" }}
          />
        </Box>
      )}

      {/* -- MOBILE: count strip + cards -- */}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
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

        <Box sx={{ p: 2 }}>
          {rows.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Typography sx={{ fontSize: 28, mb: 1 }}>??</Typography>
              <Typography variant="body2" color="text.secondary">
                {pdiMode
                  ? "PDI status will appear here once wagons reach the DM Line stage."
                  : 'Use "Create New Wagon Inspection" above to add the first wagon for this project.'}
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
                  onSkip={onSkip}
                  saving={saving}
                  pdiMode={pdiMode}
                  onGoToPdi={onGoToPdi}
                  highlighted={highlightedId === row._id}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Box>

      {/* -- DESKTOP: sticky table (sm+) -- */}
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
                <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#f1f5f9", color: "#374151", minWidth: 185 }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={2} sx={{ fontWeight: 800, bgcolor: "#fefce8", color: "#78350f" }}>
                  Total qty. ?
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
                rows.map((row, index) => {
                  const isHighlighted = highlightedId === row._id;
                  const rowStageState = getStageState(row, pdiMode);
                  const rowSkippedStages = rowStageState.skippedStages || [];
                  return (
                    <TableRow
                      key={`${pdiMode ? "pdi" : "daily"}-${row._id}`}
                      sx={{
                        bgcolor: isHighlighted
                          ? "#eff6ff"
                          : index % 2 === 0
                          ? "white"
                          : "#f9fafb",
                        outline: isHighlighted ? "2px solid #1d4ed8" : "none",
                        outlineOffset: "-2px",
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
                        const { stageList, activeStage } = getStageState(row, pdiMode);
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
                            {stageData ? stageStatusLabel(stageData) : ""}
                          </TableCell>
                        );
                      })}
                      <TableCell align="center">
                        <Stack spacing={0.75} alignItems="center">
                        {pdiMode ? (
                          row.activePdiStage ? (
                            <>
                              <Button
                                variant="contained"
                                size="small"
                                disabled={saving}
                                onClick={() => onComplete(row, row.activePdiStage)}
                                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.78rem", bgcolor: "#1d4ed8", "&:hover": { bgcolor: "#1e40af" }, borderRadius: 1.5 }}
                              >
                                {actionLabel} {row.activePdiStage.label}
                              </Button>
                              {canTemporarilySkipStage(row.activePdiStage) && (
                                <Button
                                  variant="text"
                                  size="small"
                                  disabled={saving}
                                  onClick={() => onSkip(row, row.activePdiStage)}
                                  sx={{ textTransform: "none", color: "#c2410c", fontWeight: 700, fontSize: "0.72rem" }}
                                >
                                  Skip for now
                                </Button>
                              )}
                            </>
                          ) : row.isPdiActivated ? (
                            row.pdiProgress?.stages?.some((stage) => stage.status === "skipped") ? (
                              row.pdiProgress.stages.filter((stage) => stage.status === "skipped").map((stage) => (
                                <Button
                                  key={stage.key}
                                  variant="outlined"
                                  size="small"
                                  disabled={saving}
                                  onClick={() => onComplete(row, stage)}
                                  sx={{ textTransform: "none", borderColor: "#fdba74", color: "#c2410c", fontWeight: 700, fontSize: "0.72rem" }}
                                >
                                  Complete {stageShort[stage.key] || stage.label}
                                </Button>
                              ))
                            ) : (
                              <Chip label="PDI Complete" size="small" sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }} />
                            )
                          ) : (
                            <Chip label="Not Active" size="small" sx={{ bgcolor: "#f3f4f6", color: "#6b7280", fontWeight: 700 }} />
                          )
                        ) : row.activeStage ? (
                          row.activeStage.key === "dm_line" && row.isPdiActivated ? (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => onGoToPdi?.(row._id)}
                              sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.78rem", borderColor: "#93c5fd", color: "#1d4ed8", borderRadius: 1.5, "&:hover": { borderColor: "#1d4ed8", bgcolor: "#eff6ff" } }}
                            >
                              ? Open in PDI Status
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="contained"
                                size="small"
                                disabled={saving}
                                onClick={() => onComplete(row, row.activeStage)}
                                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.78rem", bgcolor: "#15803d", "&:hover": { bgcolor: "#166534" }, borderRadius: 1.5 }}
                              >
                                {actionLabel} {row.activeStage.label}
                              </Button>
                              {canTemporarilySkipStage(row.activeStage) && (
                                <Button
                                  variant="text"
                                  size="small"
                                  disabled={saving}
                                  onClick={() => onSkip(row, row.activeStage)}
                                  sx={{ textTransform: "none", color: "#c2410c", fontWeight: 700, fontSize: "0.72rem" }}
                                >
                                  Skip for now
                                </Button>
                              )}
                            </>
                          )
                        ) : (
                          row.inspectionProgress?.stages?.some((stage) => stage.status === "skipped") ? (
                            row.inspectionProgress.stages.filter((stage) => stage.status === "skipped").map((stage) => (
                              <Button
                                key={stage.key}
                                variant="outlined"
                                size="small"
                                disabled={saving}
                                onClick={() => onComplete(row, stage)}
                                sx={{ textTransform: "none", borderColor: "#fdba74", color: "#c2410c", fontWeight: 700, fontSize: "0.72rem" }}
                              >
                                Complete {stageShort[stage.key] || stage.label}
                              </Button>
                            ))
                          ) : (
                            <Chip label="All Stages Done" size="small" sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 800 }} />
                          )
                        )}
                        {rowSkippedStages.length > 0 && (row.activeStage || row.activePdiStage) && (
                          <>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                              Re-fill skipped
                            </Typography>
                            {rowSkippedStages.map((stage) => (
                              <Button
                                key={`resume-${stage.key}`}
                                variant="outlined"
                                size="small"
                                disabled={saving}
                                onClick={() => onComplete(row, stage)}
                                sx={{ textTransform: "none", borderColor: "#fdba74", color: "#c2410c", fontWeight: 700, fontSize: "0.72rem" }}
                              >
                                Complete {stageShort[stage.key] || stage.label}
                              </Button>
                            ))}
                          </>
                        )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

// -- Main component -------------------------------------------------------------

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
  const [activeTab, setActiveTab] = useState("daily"); // "daily" | "pdi"
  const [pdiHighlightId, setPdiHighlightId] = useState(null);

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

  // Switch to PDI tab and highlight the specific wagon row
  const handleGoToPdi = (rowId) => {
    setActiveTab("pdi");
    setPdiHighlightId(rowId);
    setTimeout(() => setPdiHighlightId(null), 3500);
  };

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

  const handleCompleteStage = async (row, stage = row?.activeStage) => {
    if (!row || !stage?.key) return;
    row.activeStage = stage;
    if (stage.key === "uf_fit_up") {
      setSelectedUfRow(row);
      setNewTexNo(row.texNo || "");
      setUfDialogOpen(true);
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/wagon-data-sheet/rows/${row._id}/stages/${stage.key}/complete`, {
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

  const handleSkipStage = async (row, stage = row?.activeStage) => {
    if (!row || !stage?.key) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/wagon-data-sheet/rows/${row._id}/stages/${stage.key}/skip`, {
        submittedByUsername,
        submittedByRole,
      });
      setSuccess(`${row.texNo || "Selected TEX"} skipped ${stage.label} for later completion.`);
      await loadDashboard(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to skip stage.");
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

  const handleCompletePdiStage = async (row, stage = row?.activePdiStage) => {
    if (!row || !stage?.key) return;
    row.activePdiStage = stage;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/wagon-data-sheet/rows/${row._id}/pdi-stages/${stage.key}/complete`, {
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

  const handleSkipPdiStage = async (row, stage = row?.activePdiStage) => {
    if (!row || !stage?.key) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/wagon-data-sheet/rows/${row._id}/pdi-stages/${stage.key}/skip`, {
        submittedByUsername,
        submittedByRole,
      });
      setSuccess(`${row.texNo || "Selected TEX"} skipped ${stage.label} for later completion.`);
      await loadDashboard(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to skip PDI stage.");
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

  const tabs = [
    { key: "daily", label: "Daily Status", pending: totalPending, wagons: (dashboard.rows || []).length, color: "#15803d" },
    { key: "pdi",   label: "PDI Status",   pending: totalPdiPending, wagons: pdiRows.length, color: "#3b82f6" },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1700, mx: "auto" }}>

      {/* -- Page Header -- */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box sx={{ bgcolor: "#15803d", borderRadius: 2, p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>??</Typography>
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
        Complete each daily stage one by one. When a wagon reaches DM Line, tap "Open in PDI Status" to continue there. DM Line closes only after all PDI stages are cleared.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* -- Project selector + summary -- */}
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              borderRadius: 2,
              border: "1.5px solid #d1fae5",
              bgcolor: "white",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {[
              { label: "TEX Nos", value: dashboard.rows?.length || 0, color: "#15803d", bg: "#f0fdf4" },
              { label: "Daily Pending", value: totalPending, color: totalPending > 0 ? "#b45309" : "#6b7280", bg: totalPending > 0 ? "#fffbeb" : "#f9fafb" },
              { label: "PDI Pending", value: totalPdiPending, color: totalPdiPending > 0 ? "#1d4ed8" : "#6b7280", bg: totalPdiPending > 0 ? "#eff6ff" : "#f9fafb" },
            ].map(({ label, value, color, bg }, i) => (
              <Box
                key={label}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.9,
                  bgcolor: bg,
                  borderLeft: i > 0 ? "1.5px solid #e5e7eb" : "none",
                }}
              >
                <Typography fontWeight={900} fontSize="1.15rem" color={color} sx={{ lineHeight: 1 }}>
                  {value}
                </Typography>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
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

      {/* -- Tabbed Sections -- */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>

        {/* Tab bar */}
        <Box sx={{ display: "flex", bgcolor: "#1e293b" }}>
          {tabs.map(({ key, label, pending, wagons, color }, i) => (
            <Box
              key={key}
              onClick={() => setActiveTab(key)}
              sx={{
                flex: 1,
                py: { xs: 1.25, sm: 1.5 },
                px: { xs: 1.5, sm: 2.5 },
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.75, sm: 1 },
                flexWrap: "wrap",
                borderBottom: activeTab === key ? `3px solid ${color}` : "3px solid rgba(255,255,255,0.08)",
                bgcolor: activeTab === key ? "rgba(255,255,255,0.06)" : "transparent",
                borderRight: i === 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                transition: "background 0.15s",
                "&:hover": { bgcolor: "rgba(255,255,255,0.09)" },
                userSelect: "none",
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: activeTab === key ? color : "rgba(255,255,255,0.25)", flexShrink: 0, transition: "background 0.15s" }} />
              <Typography
                fontWeight={activeTab === key ? 800 : 600}
                fontSize={{ xs: "0.85rem", sm: "0.92rem" }}
                color={activeTab === key ? "white" : "rgba(255,255,255,0.45)"}
                sx={{ transition: "color 0.15s" }}
              >
                {label}
              </Typography>
              {pending > 0 ? (
                <Chip
                  size="small"
                  label={`${pending} pending`}
                  sx={{
                    height: 20,
                    fontSize: "0.63rem",
                    fontWeight: 800,
                    bgcolor: activeTab === key ? color : "rgba(255,255,255,0.15)",
                    color: "white",
                    transition: "background 0.15s",
                  }}
                />
              ) : wagons > 0 ? (
                <Chip
                  size="small"
                  label="All clear ?"
                  sx={{ height: 20, fontSize: "0.63rem", fontWeight: 700, bgcolor: "rgba(21,128,61,0.5)", color: "#86efac" }}
                />
              ) : null}
            </Box>
          ))}
        </Box>

        {/* Tab content */}
        {activeTab === "daily" && (
          <StageTable
            rows={dashboard.rows || []}
            stages={inspectionStages}
            counts={dashboard.stageCounts || []}
            actionLabel="Complete"
            onComplete={handleCompleteStage}
            onSkip={handleSkipStage}
            saving={saving}
            projectName={dashboard.project?.projectName || ""}
            onGoToPdi={handleGoToPdi}
          />
        )}
        {activeTab === "pdi" && (
          <StageTable
            pdiMode
            rows={pdiRows}
            stages={pdiStages}
            counts={dashboard.pdiStageCounts || []}
            actionLabel="Complete"
            onComplete={handleCompletePdiStage}
            onSkip={handleSkipPdiStage}
            saving={saving}
            projectName=""
            highlightedId={pdiHighlightId}
          />
        )}
      </Paper>

      {/* -- U/F Fit-Up TEX entry dialog -- */}
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
          <Button onClick={() => setUfDialogOpen(false)} color="inherit" disabled={saving} sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStartUfFitUp}
            disabled={saving || !newTexNo.trim()}
            sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#15803d", "&:hover": { bgcolor: "#166534" }, borderRadius: 1.5, px: 3 }}
          >
            {saving ? "Saving…" : "Confirm & Complete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
