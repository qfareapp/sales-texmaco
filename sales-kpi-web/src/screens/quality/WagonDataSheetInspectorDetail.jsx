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
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";

const TONES = {
  blue: { bg: "#eff6ff", border: "#bfdbfe", num: "#1d4ed8", lbl: "#1e40af" },
  green: { bg: "#f0fdf4", border: "#bbf7d0", num: "#15803d", lbl: "#166534" },
  amber: { bg: "#fffbeb", border: "#fde68a", num: "#b45309", lbl: "#92400e" },
  slate: { bg: "#f8fafc", border: "#e2e8f0", num: "#334155", lbl: "#475569" },
  teal: { bg: "#f0fdfa", border: "#99f6e4", num: "#0f766e", lbl: "#0d6b63" },
};

function KpiCard({ label, value, tone = "blue" }) {
  const style = TONES[tone] || TONES.blue;
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: `1.5px solid ${style.border}`, bgcolor: style.bg }}>
      <Typography fontWeight={900} sx={{ fontSize: { xs: "1.45rem", sm: "1.8rem" }, color: style.num, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" fontWeight={700} sx={{ color: style.lbl, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

function SectionCard({ title, accent = "#1d4ed8", dot = "#60a5fa", children, noPad = false }) {
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#1e293b", display: "flex", alignItems: "center", gap: 1, borderBottom: `3px solid ${accent}` }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dot, flexShrink: 0 }} />
        <Typography fontWeight={800} fontSize="0.92rem" color="white">
          {title}
        </Typography>
      </Box>
      <Box sx={noPad ? {} : { p: { xs: 1.5, sm: 2.5 } }}>{children}</Box>
    </Paper>
  );
}

function DataTable({ columns, rows, emptyText = "No data." }) {
  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: columns.length * 100 }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align || "left"}
                sx={{ fontWeight: 800, bgcolor: "#f8fafc", color: "#334155", fontSize: "0.75rem", whiteSpace: "nowrap" }}
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
              <TableRow key={row.id || index} sx={{ bgcolor: index % 2 === 0 ? "white" : "#f9fafb" }}>
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align || "left"} sx={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
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

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStageDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const textOrDash = (value) => (value ? String(value) : "-");

export default function WagonDataSheetInspectorDetail() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "";
  const isQualityModuleAdmin = role === "admin" || role === "quality-admin";
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setError("Inspector username is missing.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data } = await api.get(`/wagon-data-sheet/analytics/inspectors/${encodeURIComponent(username)}`);
        setDashboard(data?.data || null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load inspector dashboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [username]);

  const cards = useMemo(() => {
    const summary = dashboard?.summary;
    if (!summary) return [];
    return [
      { label: "Total Activities", value: summary.totalActivities || 0, tone: "blue" },
      { label: "Daily Stages", value: summary.dailyStageCompletions || 0, tone: "green" },
      { label: "PDI Stages", value: summary.pdiStageCompletions || 0, tone: "amber" },
      { label: "Forms", value: summary.formSubmissions || 0, tone: "teal" },
      { label: "Today", value: summary.completedToday || 0, tone: "slate" },
      { label: "This Week", value: summary.completedThisWeek || 0, tone: "blue" },
      { label: "Active Days", value: summary.activeDays || 0, tone: "green" },
      { label: "Avg / Active Day", value: summary.averageActivitiesPerActiveDay || 0, tone: "amber" },
    ];
  }, [dashboard]);

  if (!isQualityModuleAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">This inspector dashboard is available only for quality admin accounts.</Alert>
      </Box>
    );
  }

  const profile = dashboard?.profile;
  const summary = dashboard?.summary;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1500, mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Inspector Performance Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Complete summary for {textOrDash(profile?.name)} ({textOrDash(username)}).
          </Typography>
        </Box>
        <Chip
          label="Back to Overview"
          onClick={() => navigate("/quality/wagon-data-sheet/overview")}
          clickable
          sx={{ fontWeight: 800, bgcolor: "#dbeafe", color: "#1d4ed8" }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {loading && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>Loading inspector analytics...</Alert>}

      {dashboard && (
        <Stack spacing={3}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.1fr 1fr" }, gap: 3 }}>
            <SectionCard title="Inspector Details" accent="#0f766e" dot="#2dd4bf">
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
                {[
                  ["Name", profile?.name],
                  ["Username", profile?.username],
                  ["Role", profile?.role],
                  ["Job Role", profile?.jobRole],
                  ["Agency", profile?.agency],
                  ["Bay", profile?.bay],
                  ["SL No.", profile?.slNo],
                  ["Status", profile?.isActive ? "Active" : "Inactive"],
                ].map(([label, value]) => (
                  <Paper key={label} elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
                      {label}
                    </Typography>
                    <Typography fontWeight={700}>{textOrDash(value)}</Typography>
                  </Paper>
                ))}
              </Box>
            </SectionCard>

            <SectionCard title="Performance Summary" accent="#1d4ed8" dot="#60a5fa">
              <Stack spacing={1.1}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <Typography fontWeight={800}>Most Frequent Activity</Typography>
                  <Typography variant="body2" color="text.secondary">{textOrDash(summary?.mostFrequentActivity)}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <Typography fontWeight={800}>Last Recorded Activity</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {textOrDash(summary?.lastActivityLabel)} on {formatStageDate(summary?.lastActivityDate)}
                  </Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#fffbeb", border: "1px solid #fde68a" }}>
                  <Typography fontWeight={800}>Coverage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary?.totalProjectsWorked || 0} projects, {summary?.totalTexNosHandled || 0} TEX numbers, {summary?.independentWheelEntries || 0} independent wheel entries.
                  </Typography>
                </Paper>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip label={`CTRB (Wheel Data): ${dashboard?.formCounts?.zone1 || 0}`} sx={{ fontWeight: 700, bgcolor: "#dbeafe", color: "#1d4ed8" }} />
                  <Chip label={`DM Line Data: ${dashboard?.formCounts?.zone2 || 0}`} sx={{ fontWeight: 700, bgcolor: "#dcfce7", color: "#15803d" }} />
                  <Chip label={`DM Final Data: ${dashboard?.formCounts?.zone3 || 0}`} sx={{ fontWeight: 700, bgcolor: "#fef3c7", color: "#b45309" }} />
                </Box>
              </Stack>
            </SectionCard>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 1.5 }}>
            {cards.map((card) => (
              <KpiCard key={card.label} {...card} />
            ))}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.1fr 1fr" }, gap: 3 }}>
            <SectionCard title="Activity Breakdown" accent="#7c3aed" dot="#a78bfa" noPad>
              <DataTable
                columns={[
                  { key: "category", label: "Category" },
                  { key: "stageLabel", label: "Activity" },
                  { key: "count", label: "Count", align: "center" },
                ]}
                rows={dashboard.stageBreakdown || []}
                emptyText="No activity summary found."
              />
            </SectionCard>

            <SectionCard title="Project Spread" accent="#0f766e" dot="#2dd4bf" noPad>
              <DataTable
                columns={[
                  { key: "projectName", label: "Project" },
                  { key: "activityCount", label: "Activities", align: "center" },
                ]}
                rows={dashboard.projectSpread || []}
                emptyText="No linked project activity."
              />
            </SectionCard>
          </Box>

          <SectionCard title="Recent Activities" accent="#1d4ed8" dot="#60a5fa" noPad>
            <DataTable
              columns={[
                { key: "activityType", label: "Type" },
                { key: "stageLabel", label: "Activity" },
                { key: "projectName", label: "Project" },
                { key: "texNo", label: "TEX No." },
                { key: "wheelDataKey", label: "Wheel Data" },
                { key: "date", label: "Date", render: (row) => formatStageDate(row.date) },
              ]}
              rows={dashboard.recentActivities || []}
              emptyText="No recent activities found."
            />
          </SectionCard>

          <SectionCard title="Recent Entry Data" accent="#b45309" dot="#f59e0b" noPad>
            <DataTable
              columns={[
                { key: "zone", label: "Zone" },
                { key: "entryType", label: "Entry Type" },
                { key: "projectName", label: "Project" },
                { key: "texNo", label: "TEX No." },
                { key: "wheelDataKey", label: "Wheel Data" },
                { key: "wagonNo", label: "Wagon No." },
                { key: "submittedAt", label: "Submitted At", render: (row) => formatDateTime(row.submittedAt) },
                { key: "summary", label: "Summary" },
              ]}
              rows={dashboard.recentEntries || []}
              emptyText="No form entries found."
            />
          </SectionCard>
        </Stack>
      )}
    </Box>
  );
}
