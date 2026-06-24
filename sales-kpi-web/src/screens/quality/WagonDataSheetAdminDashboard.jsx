import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
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
  Typography,
} from "@mui/material";
import api from "../../api";
import { buildProjectLabel } from "./wagonDataSheetConfig";
import { formatStageDate, inspectionStages } from "./wagonInspectionStageConfig";

function CountChip({ label, value, color }) {
  return <Chip label={`${label}: ${value || 0}`} sx={{ bgcolor: color.bg, color: color.text, fontWeight: 800 }} />;
}

export default function WagonDataSheetAdminDashboard() {
  const role = localStorage.getItem("role") || "";
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dashboard, setDashboard] = useState({ project: null, rows: [], stageCounts: [], stages: inspectionStages });
  const [error, setError] = useState("");

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
    loadDashboard(selectedProjectId).catch(() => setError("Failed to load project dashboard."));
  }, [selectedProjectId]);

  const totals = useMemo(() => {
    const pending = (dashboard.stageCounts || []).reduce((sum, item) => sum + (item.pendingCount || 0), 0);
    const completed = (dashboard.rows || []).filter((row) => !row.activeStage).length;
    return { pending, completed };
  }, [dashboard]);

  if (role !== "admin") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">This Wagon Data Sheet dashboard is available only for admin accounts.</Alert>
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
        View project-wise inspection dates and pending load at every stage. Cells show only the completion date; blank active cells remain pending.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 3, border: "1px solid #dbeafe", bgcolor: "#f8fbff" }}>
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
            <CountChip label="TEX Rows" value={dashboard.rows?.length || 0} color={{ bg: "#e0f2fe", text: "#075985" }} />
            <CountChip label="Pending" value={totals.pending} color={{ bg: "#ffedd5", text: "#9a3412" }} />
            <CountChip label="DM Line Done" value={totals.completed} color={{ bg: "#dcfce7", text: "#166534" }} />
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <Box sx={{ p: 2, bgcolor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
          <Typography variant="subtitle2" fontWeight={800}>Pending Count By Stage</Typography>
        </Box>
        <Box sx={{ p: 2, display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 1.25 }}>
          {(dashboard.stageCounts || []).map((stage) => (
            <Chip
              key={stage.key}
              label={`${stage.label}: ${stage.pendingCount || 0}`}
              sx={{
                justifyContent: "flex-start",
                bgcolor: (stage.pendingCount || 0) > 0 ? "#fff7ed" : "#f3f4f6",
                color: (stage.pendingCount || 0) > 0 ? "#9a3412" : "#4b5563",
                fontWeight: 800,
              }}
            />
          ))}
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <Box sx={{ p: 2, bgcolor: "#111827", color: "white" }}>
          <Typography variant="subtitle2" fontWeight={800}>
            Daily Status {dashboard.project?.projectName ? `"${dashboard.project.projectName}"` : ""}
          </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: "70vh" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6" }}>SL No.</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6" }}>TEX no.</TableCell>
                {inspectionStages.map((stage) => (
                  <TableCell key={stage.key} align="center" sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 132 }}>
                    {stage.label}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 140 }}>Current Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={2} sx={{ fontWeight: 800, bgcolor: "#fff7cc" }}>Total qty. →</TableCell>
                {inspectionStages.map((stage) => {
                  const count = (dashboard.stageCounts || []).find((item) => item.key === stage.key)?.pendingCount || 0;
                  return (
                    <TableCell key={stage.key} align="center" sx={{ bgcolor: "#fff59d", fontWeight: 800 }}>
                      {count}
                    </TableCell>
                  );
                })}
                <TableCell sx={{ bgcolor: "#fffde7" }} />
              </TableRow>
              {(dashboard.rows || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={inspectionStages.length + 3} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No TEX numbers have been added for this project yet.
                  </TableCell>
                </TableRow>
              ) : (
                (dashboard.rows || []).map((row, index) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.slNo || index + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{row.texNo || "-"}</TableCell>
                    {inspectionStages.map((stage) => {
                      const stageData = row.inspectionProgress?.stages?.find((item) => item.key === stage.key);
                      const isActive = row.activeStage?.key === stage.key;
                      return (
                        <TableCell key={stage.key} align="center" sx={{ bgcolor: isActive ? "#fff7ed" : "inherit", fontWeight: stageData?.completedOn ? 700 : 600, color: stageData?.completedOn ? "#166534" : isActive ? "#b45309" : "#9ca3af" }}>
                          {stageData?.completedOn ? formatStageDate(stageData.completedOn) : isActive ? "Pending" : ""}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center">
                      {row.activeStage ? (
                        <Chip label={`Pending: ${row.activeStage.label}`} size="small" sx={{ bgcolor: "#fff7ed", color: "#9a3412", fontWeight: 800 }} />
                      ) : (
                        <Chip label="DM Line Complete" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
