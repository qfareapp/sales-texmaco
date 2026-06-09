import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api";
import {
  buildDocumentControlPdf,
  classificationOptions,
  documentTypeOptions,
  initialDocumentControlForm,
  statusOptions,
} from "./documentControlShared";

function SectionHeader({ label, color = "#0f766e" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: color }} />
      <Typography variant="subtitle2" fontWeight={700} color={color} sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: `${color}30`, ml: 1 }} />
    </Box>
  );
}

export default function DocumentControlFormScreen() {
  const [form, setForm] = useState(initialDocumentControlForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const username = localStorage.getItem("username") || "unknown";
  const role = localStorage.getItem("role") || "";

  const handleFormChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const saveEntry = async (downloadAfterSave) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        documentNumber: String(form.documentNumber || "").toUpperCase().trim(),
        status: String(form.status || "").toUpperCase(),
        classification: String(form.classification || "").toUpperCase(),
        submittedByUsername: username,
        submittedByRole: role,
        submittedAt: new Date().toISOString(),
      };

      const { data } = await api.post("/document-control/entries", payload);
      const saved = data?.data;
      setSuccess("Document control record saved successfully.");
      setForm((prev) => ({
        ...initialDocumentControlForm,
        approvedBy: prev.approvedBy,
        ownerPosition: prev.ownerPosition,
      }));

      if (downloadAfterSave && saved) {
        buildDocumentControlPdf(saved);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save document control record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1150, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box sx={{ bgcolor: "#0f766e", borderRadius: 2, p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>D</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Document Control
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Submission Form
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7, maxWidth: 850 }}>
        Fill the cover sheet, save the record, then generate the PDF and attach its printout as the first page before the hard copy goes to the MD.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #99f6e4", overflow: "hidden" }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#ccfbf1", borderBottom: "1px solid #99f6e4" }}>
          <Typography variant="subtitle2" fontWeight={700} color="#115e59">
            New Submission Cover Sheet
          </Typography>
        </Box>
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f0fdfa" }}>
          <form onSubmit={(event) => event.preventDefault()}>
            <SectionHeader label="Document Identification" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}><TextField label="Document Title *" value={form.documentTitle} onChange={handleFormChange("documentTitle")} fullWidth required size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={3}><TextField label="Document Number *" value={form.documentNumber} onChange={handleFormChange("documentNumber")} fullWidth required size="small" helperText="Example: DOC-HR-001-2026" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={3}>
                <TextField select label="Document Type" value={form.documentType} onChange={handleFormChange("documentType")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }}>
                  {documentTypeOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}><TextField label="Department / Function" value={form.departmentFunction} onChange={handleFormChange("departmentFunction")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />
            <SectionHeader label="Version and Status" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={2}><TextField label="Version" value={form.versionNumber} onChange={handleFormChange("versionNumber")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField select label="Status" value={form.status} onChange={handleFormChange("status")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }}>
                  {statusOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField select label="Classification" value={form.classification} onChange={handleFormChange("classification")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }}>
                  {classificationOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}><TextField label="Date of Issue" type="date" value={form.dateOfIssue} onChange={handleFormChange("dateOfIssue")} fullWidth size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} sm={6} md={2}><TextField label="Effective Date" type="date" value={form.effectiveDate} onChange={handleFormChange("effectiveDate")} fullWidth size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} sm={6} md={2}><TextField label="Review Date" type="date" value={form.reviewDate} onChange={handleFormChange("reviewDate")} fullWidth size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} sm={6} md={2}><TextField label="Expiry / Sunset Date" type="date" value={form.expiryDate} onChange={handleFormChange("expiryDate")} fullWidth size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />
            <SectionHeader label="Ownership and Approval" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}><TextField label="Document Owner" value={form.documentOwner} onChange={handleFormChange("documentOwner")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={4}><TextField label="Owner Position" value={form.ownerPosition} onChange={handleFormChange("ownerPosition")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={4}><TextField label="Prepared By" value={form.preparedBy} onChange={handleFormChange("preparedBy")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={4}><TextField label="Reviewed By" value={form.reviewedBy} onChange={handleFormChange("reviewedBy")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={4}><TextField label="Approved By" value={form.approvedBy} onChange={handleFormChange("approvedBy")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={4}><TextField label="Approval Date" type="date" value={form.approvalDate} onChange={handleFormChange("approvalDate")} fullWidth size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />
            <SectionHeader label="Distribution and Applicability" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}><TextField label="Applies To" value={form.appliesTo} onChange={handleFormChange("appliesTo")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={5}><TextField label="Distribution List" value={form.distributionList} onChange={handleFormChange("distributionList")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={3}><TextField label="Controlled Copy No." value={form.controlledCopyNo} onChange={handleFormChange("controlledCopyNo")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />
            <SectionHeader label="Revision History Snapshot" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={2}><TextField label="Revision Ver." value={form.revisionVersion} onChange={handleFormChange("revisionVersion")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={2}><TextField label="Revision Date" type="date" value={form.revisionDate} onChange={handleFormChange("revisionDate")} fullWidth size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={3}><TextField label="Revision Author" value={form.revisionAuthor} onChange={handleFormChange("revisionAuthor")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={5}><TextField label="Revision Description" value={form.revisionDescription} onChange={handleFormChange("revisionDescription")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
              <Grid item xs={12} md={4}><TextField label="Revision Approved By" value={form.revisionApprovedBy} onChange={handleFormChange("revisionApprovedBy")} fullWidth size="small" sx={{ bgcolor: "white", borderRadius: 1 }} /></Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: "1px dashed #5eead4", bgcolor: "rgba(255,255,255,0.75)" }}>
              <Typography variant="body2" color="text.secondary">
                Submission audit will be stamped automatically as <b>{username}</b> ({role || "unknown"}) at the time of save.
              </Typography>
            </Paper>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: { xs: "stretch", sm: "flex-end" } }}>
              <Button variant="outlined" size="large" onClick={() => setForm(initialDocumentControlForm)} sx={{ borderRadius: 2 }}>
                Reset Form
              </Button>
              <Button variant="contained" size="large" disabled={saving || !form.documentTitle || !form.documentNumber} onClick={() => saveEntry(false)} sx={{ borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#115e59" } }}>
                {saving ? "Saving..." : "Save Record"}
              </Button>
              <Button variant="contained" size="large" disabled={saving || !form.documentTitle || !form.documentNumber} onClick={() => saveEntry(true)} sx={{ borderRadius: 2, bgcolor: "#155e75", "&:hover": { bgcolor: "#164e63" } }}>
                {saving ? "Preparing..." : "Save and Generate PDF"}
              </Button>
            </Box>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}
