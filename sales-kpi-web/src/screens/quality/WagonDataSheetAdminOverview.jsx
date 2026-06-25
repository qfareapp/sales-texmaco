import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import api from "../../api";

// ── Design tokens ──────────────────────────────────────────────────────────────
const TONES = {
  blue:  { bg: "#eff6ff", border: "#bfdbfe", num: "#1d4ed8", lbl: "#1e40af" },
  green: { bg: "#f0fdf4", border: "#bbf7d0", num: "#15803d", lbl: "#166534" },
  amber: { bg: "#fffbeb", border: "#fde68a", num: "#b45309", lbl: "#92400e" },
  red:   { bg: "#fef2f2", border: "#fecaca", num: "#dc2626", lbl: "#991b1b" },
  slate: { bg: "#f8fafc", border: "#e2e8f0", num: "#334155", lbl: "#475569" },
  teal:  { bg: "#f0fdfa", border: "#99f6e4", num: "#0f766e", lbl: "#0d6b63" },
};

function severityColor(value, maxValue) {
  if (value === 0) return "#d1d5db";
  const ratio = value / Math.max(maxValue, 1);
  if (ratio < 0.3) return "#16a34a";
  if (ratio < 0.65) return "#d97706";
  return "#dc2626";
}

// ── Shared components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, tone = "blue", icon = "" }) {
  const s = TONES[tone] || TONES.blue;
  return (
    <Paper
      elevation={0}
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.25, sm: 1.75 },
        borderRadius: 2.5,
        border: `1.5px solid ${s.border}`,
        bgcolor: s.bg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {icon && (
        <Typography
          sx={{ position: "absolute", top: 8, right: 10, fontSize: "1.5rem", opacity: 0.15, lineHeight: 1, userSelect: "none" }}
        >
          {icon}
        </Typography>
      )}
      <Typography fontWeight={900} sx={{ fontSize: { xs: "1.55rem", sm: "1.9rem" }, color: s.num, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{ color: s.lbl, textTransform: "uppercase", letterSpacing: 0.5, display: "block", mt: 0.4, fontSize: "0.67rem" }}
      >
        {label}
      </Typography>
    </Paper>
  );
}

function SectionCard({ title, accent = "#1d4ed8", dot = "#60a5fa", children, noPad = false }) {
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: "#1e293b",
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: `3px solid ${accent}`,
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dot, flexShrink: 0 }} />
        <Typography fontWeight={800} fontSize="0.92rem" color="white">
          {title}
        </Typography>
      </Box>
      <Box sx={noPad ? {} : { p: { xs: 1.5, sm: 2.5 } }}>{children}</Box>
    </Paper>
  );
}

// Stage bottleneck bar list
function StageBottlenecks({ items, accent }) {
  const maxValue = Math.max(...items.map((item) => item.pendingCount || 0), 1);
  return (
    <Stack spacing={1.1}>
      {items.map((item) => {
        const value = item.pendingCount || 0;
        const barColor = severityColor(value, maxValue);
        const barWidth = value === 0 ? 4 : Math.max(6, Math.round((value / maxValue) * 100));
        return (
          <Box key={item.key}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography variant="body2" fontWeight={600} color="#334155" noWrap sx={{ maxWidth: "78%" }}>
                {item.label}
              </Typography>
              <Box
                sx={{
                  minWidth: 26,
                  height: 22,
                  px: 0.75,
                  borderRadius: 1,
                  bgcolor: value === 0 ? "#f3f4f6" : barColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 900, color: value === 0 ? "#9ca3af" : "white", lineHeight: 1 }}>
                  {value}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ height: 7, borderRadius: 999, bgcolor: "#f1f5f9", overflow: "hidden" }}>
              <Box
                sx={{
                  width: `${barWidth}%`,
                  height: "100%",
                  bgcolor: barColor,
                  borderRadius: 999,
                  transition: "width 0.6s ease",
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

// Scrollable table (mobile-safe)
function DataTable({ columns, rows, emptyText = "No data." }) {
  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: columns.length * 90 }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align || "left"}
                sx={{ fontWeight: 800, bgcolor: "#f8fafc", color: "#334155", fontSize: "0.75rem", whiteSpace: "nowrap", py: 1 }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: "text.secondary" }}>
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow
                key={row.id || row.key || row.texNo || row.projectName || index}
                sx={{ bgcolor: index % 2 === 0 ? "white" : "#f9fafb", "&:hover": { bgcolor: "#f0f9ff" } }}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align || "left"} sx={{ fontSize: "0.82rem" }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Cycle time stat row
function CycleStat({ label, value, tone = "slate" }) {
  const s = TONES[tone] || TONES.slate;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1.1,
        borderRadius: 2,
        bgcolor: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      <Typography variant="body2" fontWeight={600} color="#334155">
        {label}
      </Typography>
      <Typography fontWeight={900} color={s.num} sx={{ fontSize: "1.05rem" }}>
        {value}
      </Typography>
    </Box>
  );
}

// Data quality checklist item
function QualityItem({ label, value, warn = false, critical = false }) {
  const isOk = value === 0 || value === "0";
  const icon = isOk ? "✓" : critical ? "✕" : "!";
  const bg = isOk ? "#f0fdf4" : critical ? "#fef2f2" : "#fffbeb";
  const border = isOk ? "#bbf7d0" : critical ? "#fecaca" : "#fde68a";
  const iconBg = isOk ? "#16a34a" : critical ? "#dc2626" : "#d97706";
  const valColor = isOk ? "#15803d" : critical ? "#dc2626" : "#b45309";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        border: `1.5px solid ${border}`,
        bgcolor: bg,
      }}
    >
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          bgcolor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Typography sx={{ color: "white", fontSize: "0.65rem", fontWeight: 900, lineHeight: 1 }}>{icon}</Typography>
      </Box>
      <Typography variant="body2" fontWeight={600} color="#334155" sx={{ flex: 1 }}>
        {label}
      </Typography>
      <Typography fontWeight={900} sx={{ fontSize: "0.95rem", color: valColor }}>
        {isOk ? "None" : value}
      </Typography>
    </Box>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WagonDataSheetAdminOverview() {
  const role = localStorage.getItem("role") || "";
  const isQualityModuleAdmin = role === "admin" || role === "quality-admin";
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/wagon-data-sheet/analytics/overview")
      .then(({ data }) => setOverview(data?.data || null))
      .catch((err) => setError(err.response?.data?.message || "Failed to load wagon data sheet overview."));
  }, []);

  const kpiCards = useMemo(() => {
    if (!overview) return [];
    const { overall, dataQuality } = overview;
    return [
      { label: "Total Projects",     value: overall.totalProjects || 0,           tone: "slate", icon: "📁" },
      { label: "Total TEX Nos",      value: overall.totalTexNos || 0,             tone: "blue",  icon: "🚃" },
      { label: "Daily Pending",      value: overall.dailyInProgress || 0,         tone: "amber", icon: "⏳" },
      { label: "PDI Pending",        value: overall.pdiInProgress || 0,           tone: "amber", icon: "🔷" },
      { label: "Completed Wagons",   value: overall.fullyCompletedWagons || 0,    tone: "green", icon: "✅" },
      { label: "Completion %",       value: `${overall.completionPercent || 0}%`, tone: "green", icon: "📊" },
      { label: "Ready For Zone 2",   value: overall.readyForZone2 || 0,           tone: "blue",  icon: "➡️" },
      { label: "Zone 2 Gap",         value: dataQuality?.zone2PendingThoughEligible || 0, tone: "red", icon: "⚠️" },
    ];
  }, [overview]);

  if (!isQualityModuleAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">This overview is available only for quality admin accounts.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1700, mx: "auto" }}>

      {/* ── Page header ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: "#0f766e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: "white", fontWeight: 900, fontSize: "1.2rem", lineHeight: 1 }}>W</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Wagon Data Sheet Overview
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Admin One-Page Dashboard
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: { xs: 0, sm: 7 } }}>
        Throughput, bottlenecks, project readiness, inspector activity, cycle time, and data quality — all in one place.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {!overview && !error && <Alert severity="info" sx={{ borderRadius: 2 }}>Loading overview data…</Alert>}

      {overview && (
        <Box sx={{ display: "grid", gap: { xs: 2, md: 3 } }}>

          {/* ── KPI grid ── */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: { xs: 1, sm: 1.5 } }}>
            {kpiCards.map((card) => (
              <KpiCard key={card.label} {...card} />
            ))}
          </Box>

          {/* ── Stage bottlenecks ── */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: { xs: 2, md: 3 } }}>
            <SectionCard title="Daily Stage Bottlenecks" accent="#d97706" dot="#fbbf24">
              {(overview.stageCounts || []).length > 0 ? (
                <StageBottlenecks items={overview.stageCounts} accent="#d97706" />
              ) : (
                <Typography variant="body2" color="text.secondary">No daily stage data.</Typography>
              )}
            </SectionCard>
            <SectionCard title="PDI Stage Bottlenecks" accent="#3b82f6" dot="#60a5fa">
              {(overview.pdiStageCounts || []).length > 0 ? (
                <StageBottlenecks items={overview.pdiStageCounts} accent="#3b82f6" />
              ) : (
                <Typography variant="body2" color="text.secondary">No PDI stage data.</Typography>
              )}
            </SectionCard>
          </Box>

          {/* ── Project performance ── */}
          <SectionCard title="Project Performance" accent="#0f766e" dot="#2dd4bf" noPad>
            <DataTable
              columns={[
                { key: "projectName", label: "Project" },
                { key: "totalTexNos", label: "TEX Nos", align: "center" },
                { key: "dailyPending", label: "Daily Pending", align: "center" },
                { key: "pdiPending", label: "PDI Pending", align: "center" },
                { key: "readyForZone2", label: "Ready Zone 2", align: "center" },
                { key: "completed", label: "Done", align: "center" },
                {
                  key: "completionPercent",
                  label: "Completion",
                  align: "center",
                  render: (row) => {
                    const pct = row.completionPercent || 0;
                    const bg = pct >= 80 ? "#dcfce7" : pct >= 50 ? "#fef3c7" : "#fee2e2";
                    const color = pct >= 80 ? "#15803d" : pct >= 50 ? "#b45309" : "#dc2626";
                    return (
                      <Chip
                        size="small"
                        label={`${pct}%`}
                        sx={{ fontWeight: 800, bgcolor: bg, color, fontSize: "0.75rem" }}
                      />
                    );
                  },
                },
              ]}
              rows={overview.projectPerformance || []}
              emptyText="No project performance data."
            />
          </SectionCard>

          {/* ── Cycle time + Readiness ── */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1.4fr" }, gap: { xs: 2, md: 3 } }}>
            <SectionCard title="Cycle Time & Aging" accent="#7c3aed" dot="#a78bfa">
              <Stack spacing={1}>
                <CycleStat label="Avg U/F Fit-Up → DM Line"   value={`${overview.aging?.averageUfToDmDays || 0} days`}     tone="slate" />
                <CycleStat label="Avg DM Line → PDI Closed"   value={`${overview.aging?.averageDmToPdiCloseDays || 0} days`} tone="blue"  />
                <CycleStat label="Avg Total Cycle"             value={`${overview.aging?.averageTotalCycleDays || 0} days`}  tone="teal"  />
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 0.5 }}>
                  <CycleStat label="Over 3 Days" value={overview.aging?.pendingOver3Days || 0}  tone={overview.aging?.pendingOver3Days > 0 ? "amber" : "green"} />
                  <CycleStat label="Over 7 Days" value={overview.aging?.pendingOver7Days || 0}  tone={overview.aging?.pendingOver7Days > 0 ? "red"   : "green"} />
                </Box>
                {overview.aging?.oldestPending ? (
                  <Box sx={{ mt: 0.5, p: 1.5, borderRadius: 2, border: "1.5px dashed #fcd34d", bgcolor: "#fffbeb" }}>
                    <Typography variant="caption" fontWeight={800} color="#92400e" sx={{ textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 0.5 }}>
                      Oldest Pending
                    </Typography>
                    <Typography fontWeight={800} fontSize="0.92rem" color="#111827">
                      {overview.aging.oldestPending.texNo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {overview.aging.oldestPending.projectName} · {overview.aging.oldestPending.currentStage}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${overview.aging.oldestPending.ageDays} days pending`}
                      sx={{ ml: 1, height: 18, fontSize: "0.62rem", fontWeight: 800, bgcolor: "#fee2e2", color: "#dc2626" }}
                    />
                  </Box>
                ) : null}
              </Stack>
            </SectionCard>

            <SectionCard title="Readiness & Documentation" accent="#0f766e" dot="#2dd4bf">
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.25 }}>
                {[
                  { label: "Reached DM / PDI",    value: overview.overall?.reachedDmLine || 0,    tone: "blue"  },
                  { label: "Waiting In PDI",       value: overview.overall?.waitingInPdi || 0,     tone: "amber" },
                  { label: "Final PDI Cleared",    value: overview.overall?.finalPdiCleared || 0,  tone: "green" },
                  { label: "Zone 2 Started",       value: overview.overall?.zone2Started || 0,     tone: "blue"  },
                  { label: "Zone 2 Completed",     value: overview.overall?.zone2Completed || 0,   tone: "green" },
                  { label: "Fully Documented",     value: overview.overall?.fullyDocumented || 0,  tone: "teal"  },
                ].map((card) => (
                  <KpiCard key={card.label} {...card} />
                ))}
              </Box>
            </SectionCard>
          </Box>

          {/* ── Inspector + Data quality ── */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.4fr 1fr" }, gap: { xs: 2, md: 3 } }}>
            <SectionCard title="Inspector Productivity" accent="#1d4ed8" dot="#60a5fa" noPad>
              <DataTable
                columns={[
                  { key: "username", label: "Inspector" },
                  { key: "dailyStageCompletions", label: "Daily", align: "center" },
                  { key: "pdiStageCompletions", label: "PDI", align: "center" },
                  { key: "formSubmissions", label: "Forms", align: "center" },
                  { key: "completedToday", label: "Today", align: "center" },
                  { key: "completedThisWeek", label: "This Week", align: "center" },
                  { key: "totalCompletions", label: "Total", align: "center" },
                ]}
                rows={overview.stageCompletionsByInspector || []}
                emptyText="No inspector activity data."
              />
            </SectionCard>

            <SectionCard title="Data Quality & Exceptions" accent="#dc2626" dot="#f87171">
              <Stack spacing={0.85}>
                <QualityItem label="Rows Without TEX No."              value={overview.dataQuality?.rowsWithoutTexNo || 0}                    critical />
                <QualityItem label="Zone 2 Eligible But Pending"        value={overview.dataQuality?.zone2PendingThoughEligible || 0}           warn />
                <QualityItem label="Stuck Without Active Stage"         value={overview.dataQuality?.rowsStuckWithoutActiveStage || 0}          critical />
                <QualityItem label="PDI Reached But Not Activated"      value={overview.dataQuality?.rowsReachedPdiButNotActivated || 0}        critical />
                <QualityItem label="Incomplete Required Forms"          value={overview.dataQuality?.incompleteRequiredForms || 0}              warn />
                <Box sx={{ pt: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6, display: "block", mb: 0.75 }}>
                    Duplicate TEX Nos
                  </Typography>
                  {(overview.dataQuality?.duplicateTexNos || []).length ? (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {overview.dataQuality.duplicateTexNos.map((item) => (
                        <Chip key={item.texNo} label={`${item.texNo} ×${item.count}`} size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
                      ))}
                    </Stack>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.85, borderRadius: 1.5, bgcolor: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
                      <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography sx={{ color: "white", fontSize: "0.6rem", fontWeight: 900 }}>✓</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600} color="#15803d">No duplicate TEX numbers</Typography>
                    </Box>
                  )}
                </Box>
              </Stack>
            </SectionCard>
          </Box>

          {/* ── Stalled wagons ── */}
          <SectionCard title="Stalled Wagons" accent="#dc2626" dot="#f87171" noPad>
            {/* Desktop: table */}
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <DataTable
                columns={[
                  { key: "texNo", label: "TEX No." },
                  { key: "projectName", label: "Project" },
                  { key: "currentStage", label: "Current Stage" },
                  {
                    key: "ageDays",
                    label: "Age",
                    align: "center",
                    render: (row) => {
                      const d = row.ageDays || 0;
                      const color = d >= 7 ? "#dc2626" : d >= 3 ? "#d97706" : "#334155";
                      return <Typography fontWeight={800} fontSize="0.82rem" color={color}>{d}d</Typography>;
                    },
                  },
                ]}
                rows={overview.aging?.stalledWagons || []}
                emptyText="No stalled wagons above threshold — all wagons are moving."
              />
            </Box>

            {/* Mobile: cards */}
            <Box sx={{ display: { xs: "block", sm: "none" }, p: 1.5 }}>
              {(overview.aging?.stalledWagons || []).length === 0 ? (
                <Box sx={{ py: 3, textAlign: "center" }}>
                  <Typography sx={{ fontSize: 24, mb: 0.5 }}>✅</Typography>
                  <Typography variant="body2" color="text.secondary">No stalled wagons — all moving.</Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {overview.aging.stalledWagons.map((wagon, i) => {
                    const d = wagon.ageDays || 0;
                    const borderColor = d >= 7 ? "#fecaca" : "#fde68a";
                    const ageColor = d >= 7 ? "#dc2626" : "#b45309";
                    const ageBg = d >= 7 ? "#fef2f2" : "#fffbeb";
                    return (
                      <Box
                        key={wagon.texNo || i}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: `1.5px solid ${borderColor}`,
                          bgcolor: ageBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography fontWeight={800} fontSize="0.9rem">{wagon.texNo}</Typography>
                          <Typography variant="caption" color="text.secondary">{wagon.projectName}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{wagon.currentStage}</Typography>
                        </Box>
                        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                          <Typography fontWeight={900} fontSize="1.3rem" color={ageColor} sx={{ lineHeight: 1 }}>{d}</Typography>
                          <Typography variant="caption" fontWeight={700} color={ageColor}>days</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </SectionCard>

        </Box>
      )}
    </Box>
  );
}
