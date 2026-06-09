import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
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
import api from "../api";
import {
  adminStatusOptions,
  buildDocumentControlPdf,
  formatDocumentControlDateTime,
  initialDocumentControlFilters,
  statusOptions,
} from "./documentControlShared";

function StatCard({ label, value, tone }) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1.5px solid #cbd5e1", bgcolor: tone }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.7 }}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800}>
        {value}
      </Typography>
    </Paper>
  );
}

export default function DocumentControlDashboardScreen() {
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState(initialDocumentControlFilters);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [updatingId, setUpdatingId] = useState("");
  const role = localStorage.getItem("role") || "";
  const isAdmin = role === "admin";

  const loadEntries = async (activeFilters = filters) => {
    setLoading(true);
    try {
      const { data } = await api.get("/document-control/entries", { params: activeFilters });
      const loadedEntries = data?.data || [];
      setEntries(loadedEntries);
      setStatusDrafts(
        loadedEntries.reduce((acc, entry) => {
          acc[entry._id] = entry.adminStatus || "";
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load document control records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries(initialDocumentControlFilters);
  }, []);

  const summary = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: entries.length,
      draft: entries.filter((entry) => entry.status === "DRAFT").length,
      underReview: entries.filter((entry) => entry.status === "UNDER REVIEW").length,
      approved: entries.filter((entry) => entry.status === "APPROVED").length,
      today: entries.filter((entry) => new Date(entry.submittedAt).toDateString() === today).length,
    };
  }, [entries]);

  const handleFilterChange = (field) => (event) =>
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSearch = async () => {
    setError("");
    await loadEntries(filters);
  };

  const handleResetFilters = async () => {
    setFilters(initialDocumentControlFilters);
    setError("");
    await loadEntries(initialDocumentControlFilters);
  };

  const handleStatusDraftChange = (entryId) => (event) => {
    const value = event.target.value;
    setStatusDrafts((prev) => ({ ...prev, [entryId]: value }));
  };

  const handleStatusUpdate = async (entryId) => {
    const nextStatus = statusDrafts[entryId];
    if (!nextStatus) return;

    setUpdatingId(entryId);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/document-control/entries/${entryId}/admin-status`, { adminStatus: nextStatus });
      setSuccess("Admin status updated successfully.");
      await loadEntries(filters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update admin status.");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1350, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box sx={{ bgcolor: "#334155", borderRadius: 2, p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>D</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Document Control
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Submission Dashboard
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7, maxWidth: 850 }}>
        Track who submitted which document, at what time, for MD approval and version control.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}><StatCard label="Total Records" value={summary.total} tone="#f8fafc" /></Grid>
        <Grid item xs={6} md={2.4}><StatCard label="Draft" value={summary.draft} tone="#fefce8" /></Grid>
        <Grid item xs={6} md={2.4}><StatCard label="Under Review" value={summary.underReview} tone="#fff7ed" /></Grid>
        <Grid item xs={6} md={2.4}><StatCard label="Approved" value={summary.approved} tone="#ecfdf5" /></Grid>
        <Grid item xs={12} md={2.4}><StatCard label="Submitted Today" value={summary.today} tone="#eff6ff" /></Grid>
      </Grid>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #cbd5e1", overflow: "hidden" }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
          <Typography variant="subtitle2" fontWeight={700} color="#334155">
            Submission Dashboard
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField label="Search" value={filters.q} onChange={handleFilterChange("q")} fullWidth size="small" placeholder="Document no., title, department, submitter" />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField select label="Status" value={filters.status} onChange={handleFilterChange("status")} fullWidth size="small">
                <MenuItem value="">All</MenuItem>
                {statusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label="Department" value={filters.department} onChange={handleFilterChange("department")} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={handleSearch} sx={{ bgcolor: "#0f766e", "&:hover": { bgcolor: "#115e59" } }}>
                  Filter
                </Button>
                <Button variant="outlined" onClick={handleResetFilters}>
                  Reset
                </Button>
              </Stack>
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "#f8fafc" } }}>
                  <TableCell>Submitted At</TableCell>
                  <TableCell>Document No.</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Prepared By</TableCell>
                  <TableCell>Submitted By</TableCell>
                  <TableCell>Admin Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry._id} hover>
                    <TableCell>{formatDocumentControlDateTime(entry.submittedAt)}</TableCell>
                    <TableCell>{entry.documentNumber || "-"}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{entry.documentTitle || "-"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Issue: {entry.dateOfIssue || "-"} | Effective: {entry.effectiveDate || "-"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{entry.departmentFunction || "-"}</TableCell>
                    <TableCell>{entry.versionNumber || "-"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={entry.status || "-"} color={entry.status === "APPROVED" ? "success" : entry.status === "UNDER REVIEW" ? "warning" : "default"} />
                    </TableCell>
                    <TableCell>{entry.preparedBy || "-"}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{entry.submittedByUsername || "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">{entry.submittedByRole || "-"}</Typography>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            select
                            size="small"
                            value={statusDrafts[entry._id] || ""}
                            onChange={handleStatusDraftChange(entry._id)}
                            sx={{ minWidth: 170 }}
                          >
                            <MenuItem value="">Not Set</MenuItem>
                            {adminStatusOptions.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={updatingId === entry._id || !statusDrafts[entry._id] || (statusDrafts[entry._id] || "") === (entry.adminStatus || "")}
                            onClick={() => handleStatusUpdate(entry._id)}
                            sx={{ whiteSpace: "nowrap" }}
                          >
                            {updatingId === entry._id ? "Saving..." : "Update"}
                          </Button>
                        </Stack>
                      ) : (
                        <Chip size="small" label={entry.adminStatus || "Not Set"} color={entry.adminStatus === "APPROVED" || entry.adminStatus === "SIGNATURE DONE" ? "success" : entry.adminStatus === "CHANGE SUGGESTED" ? "warning" : entry.adminStatus === "REJECTED" ? "error" : "default"} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => buildDocumentControlPdf(entry)}>
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No document-control records found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Box>
  );
}
