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
  Paper,
  Stack,
  Switch,
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

const initialNewInspector = {
  name: "",
  jobRole: "",
  bay: "",
  agency: "",
  username: "",
  isActive: true,
};

function InspectorRow({ row, draft, onChange, onSave, onResetPassword, savingId, tempPassword }) {
  const isSaving = savingId === row._id;

  return (
    <TableRow>
      <TableCell>{row.slNo}</TableCell>
      <TableCell sx={{ minWidth: 220 }}>
        <TextField size="small" value={draft.name} onChange={(e) => onChange(row._id, "name", e.target.value)} fullWidth />
      </TableCell>
      <TableCell sx={{ minWidth: 260 }}>
        <TextField size="small" value={draft.jobRole} onChange={(e) => onChange(row._id, "jobRole", e.target.value)} fullWidth />
      </TableCell>
      <TableCell sx={{ minWidth: 120 }}>
        <TextField size="small" value={draft.bay} onChange={(e) => onChange(row._id, "bay", e.target.value)} fullWidth />
      </TableCell>
      <TableCell sx={{ minWidth: 120 }}>
        <TextField size="small" value={draft.agency} onChange={(e) => onChange(row._id, "agency", e.target.value)} fullWidth />
      </TableCell>
      <TableCell sx={{ minWidth: 180 }}>
        <TextField
          size="small"
          value={draft.username}
          onChange={(e) => onChange(row._id, "username", e.target.value)}
          fullWidth
          helperText="Inspector login username"
        />
      </TableCell>
      <TableCell align="center">
        <Switch checked={Boolean(draft.isActive)} onChange={(e) => onChange(row._id, "isActive", e.target.checked)} />
      </TableCell>
      <TableCell>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={row.hasPassword ? "Password Set" : "No Password"} color={row.hasPassword ? "success" : "warning"} variant={row.hasPassword ? "filled" : "outlined"} />
            <Chip size="small" label={row.mustChangePassword ? "Must Change On Login" : "Password Active"} color={row.mustChangePassword ? "warning" : "default"} variant="outlined" />
          </Stack>
          {tempPassword ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Temporary password: <b>{tempPassword}</b>
            </Alert>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Passwords are auto-generated and shown only after load/reset.
            </Typography>
          )}
        </Stack>
      </TableCell>
      <TableCell align="center">
        <Stack spacing={1} alignItems="center">
          <Button variant="contained" size="small" disabled={isSaving} onClick={() => onSave(row._id)}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button variant="outlined" size="small" disabled={isSaving} onClick={() => onResetPassword(row._id)}>
            Reset Password
          </Button>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default function WagonInspectorAccountsPage() {
  const role = localStorage.getItem("role") || "";
  const isQualityModuleAdmin = role === "admin" || role === "quality-admin";
  const [inspectors, setInspectors] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [tempPasswords, setTempPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newInspector, setNewInspector] = useState(initialNewInspector);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadInspectors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/inspector-accounts");
      const items = data?.data || [];
      setInspectors(items);
      setDrafts(
        items.reduce((acc, item) => {
          acc[item._id] = {
            slNo: item.slNo,
            name: item.name,
            jobRole: item.jobRole,
            bay: item.bay,
            agency: item.agency,
            username: item.username,
            isActive: item.isActive,
          };
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inspector accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspectors();
  }, []);

  const passwordSummary = useMemo(
    () => ({
      set: inspectors.filter((item) => item.hasPassword).length,
      active: inspectors.filter((item) => item.isActive).length,
      firstLoginPending: inspectors.filter((item) => item.mustChangePassword).length,
    }),
    [inspectors]
  );

  const handleChange = (inspectorId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [inspectorId]: {
        ...prev[inspectorId],
        [field]: value,
      },
    }));
  };

  const handleNewInspectorChange = (field, value) => {
    setNewInspector((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLoadDefaults = async () => {
    setLoadingDefaults(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/inspector-accounts/load-defaults");
      const generatedPasswords = data?.generatedPasswords || [];
      await loadInspectors();
      setTempPasswords(
        generatedPasswords.reduce((acc, item) => {
          acc[item.username] = item.password;
          return acc;
        }, {})
      );
      setSuccess("Default inspector details loaded. Temporary passwords were auto-generated for accounts missing a password.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load default inspector details.");
    } finally {
      setLoadingDefaults(false);
    }
  };

  const handleSave = async (inspectorId) => {
    setSavingId(inspectorId);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/inspector-accounts/${inspectorId}`, drafts[inspectorId]);
      await loadInspectors();
      setSuccess("Inspector account updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save inspector account.");
    } finally {
      setSavingId("");
    }
  };

  const handleResetPassword = async (inspectorId) => {
    setSavingId(inspectorId);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post(`/inspector-accounts/${inspectorId}/reset-password`);
      const generatedPassword = data?.generatedPassword || "";
      const username = data?.data?.username || "";
      await loadInspectors();
      setTempPasswords((prev) => ({ ...prev, [username]: generatedPassword }));
      setSuccess(`Temporary password reset for ${username}. The inspector will be forced to set a new password on first login.`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset inspector password.");
    } finally {
      setSavingId("");
    }
  };

  const handleCreateInspector = async () => {
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/inspector-accounts", {
        ...newInspector,
      });
      await loadInspectors();
      const username = data?.data?.username || "";
      const generatedPassword = data?.generatedPassword || "";
      if (username && generatedPassword) {
        setTempPasswords((prev) => ({ ...prev, [username]: generatedPassword }));
      }
      setSuccess(`Inspector created successfully.${username && generatedPassword ? ` Temporary password for ${username}: ${generatedPassword}` : ""}`);
      setCreateOpen(false);
      setNewInspector(initialNewInspector);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create inspector account.");
    } finally {
      setCreating(false);
    }
  };

  if (!isQualityModuleAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Inspector account management is available only for quality admin accounts.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1700, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", gap: 2, mb: 0.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ bgcolor: "#7c3aed", borderRadius: 2, p: 1, color: "white", fontWeight: 900 }}>I</Box>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.08 }}>
              Inspector Details
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
              Admin Inspector Account Setup
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          onClick={() => setCreateOpen(true)}
          sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" } }}
        >
          Add New Inspector
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        The system auto-generates a temporary password for each inspector. On first login, the inspector must set a new password. If a password is forgotten, admin can reset it to a new temporary password from this page.
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: "1.5px solid #ddd6fe", bgcolor: "#faf5ff" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Inspectors Loaded: ${inspectors.length}`} sx={{ bgcolor: "#ede9fe", color: "#5b21b6", fontWeight: 800 }} />
            <Chip label={`Passwords Set: ${passwordSummary.set}`} sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 800 }} />
            <Chip label={`First Login Pending: ${passwordSummary.firstLoginPending}`} sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 800 }} />
            <Chip label={`Active: ${passwordSummary.active}`} sx={{ bgcolor: "#e0f2fe", color: "#075985", fontWeight: 800 }} />
          </Stack>
          <Button variant="contained" disabled={loadingDefaults} onClick={handleLoadDefaults} sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" } }}>
            {loadingDefaults ? "Loading..." : "Load Default Inspector Details"}
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #e5e7eb", overflow: "hidden" }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
          <Typography variant="subtitle1" fontWeight={800}>
            Inspector Master
          </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: "72vh" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>SL No.</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Job Role</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Bay</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Agency</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Username</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Active</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Password Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Loading inspector accounts...
                  </TableCell>
                </TableRow>
              ) : inspectors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No inspector records found yet. Click `Load Default Inspector Details` to load the provided inspector list.
                  </TableCell>
                </TableRow>
              ) : (
                inspectors.map((row) => (
                  <InspectorRow
                    key={row._id}
                    row={row}
                    draft={drafts[row._id]}
                    onChange={handleChange}
                    onSave={handleSave}
                    onResetPassword={handleResetPassword}
                    savingId={savingId}
                    tempPassword={tempPasswords[row.username] || ""}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Inspector</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              size="small"
              value={newInspector.name}
              onChange={(e) => handleNewInspectorChange("name", e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Job Role"
              size="small"
              value={newInspector.jobRole}
              onChange={(e) => handleNewInspectorChange("jobRole", e.target.value)}
              fullWidth
            />
            <TextField
              label="Bay"
              size="small"
              value={newInspector.bay}
              onChange={(e) => handleNewInspectorChange("bay", e.target.value)}
              fullWidth
            />
            <TextField
              label="Agency"
              size="small"
              value={newInspector.agency}
              onChange={(e) => handleNewInspectorChange("agency", e.target.value)}
              fullWidth
            />
            <TextField
              label="Username"
              size="small"
              value={newInspector.username}
              onChange={(e) => handleNewInspectorChange("username", e.target.value)}
              helperText="Inspector login username"
              fullWidth
              required
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
              <Switch
                checked={Boolean(newInspector.isActive)}
                onChange={(e) => handleNewInspectorChange("isActive", e.target.checked)}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              A temporary password will be auto-generated. On first login, the inspector will be forced to set a new password.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit" disabled={creating} sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateInspector}
            disabled={creating || !newInspector.name.trim() || !newInspector.username.trim()}
            sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" } }}
          >
            {creating ? "Creating..." : "Create Inspector"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
