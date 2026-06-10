import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { buildProjectLabel } from "./wagonDataSheetConfig";

const initialForm = {
  projectName: "",
  contractPoNumber: "",
  contractPoDate: "",
  deliveryPeriodUpto: "",
  totalQuantity: "",
  wagonTypeInPo: "",
  contractPlacedBy: "",
  wagonManufacturer: "",
  wagonTypeOffered: "",
  wagonsOfferedForInspection: "",
  inspectionOfferDate: "",
  notes: "",
};

function SectionHeader({ label, color = "#0369a1" }) {
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

function StatBadge({ label, value, color = "default" }) {
  return (
    <Box sx={{ textAlign: "center", px: 1 }}>
      <Typography variant="h6" fontWeight={800} color={color !== "default" ? color : "text.primary"} sx={{ lineHeight: 1 }}>
        {value ?? 0}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function WagonDataSheetProjectForm() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/wagon-data-sheet/projects");
      setProjects(data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load projects.");
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/wagon-data-sheet/projects", form);
      setSuccess("Project created successfully.");
      setForm(initialForm);
      setCreateOpen(false);
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      {/* ── Page Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#0369a1",
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>📋</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Wagon Data Sheet
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Project Setup
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7 }}>
        Blue fields are created once by admin and reused by inspectors in both zones.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* ── Admin Form ── */}
      {role === "admin" ? (
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: 3,
            border: "1.5px solid #7dd3fc",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 1.5,
              bgcolor: "#e0f2fe",
              borderBottom: createOpen ? "1px solid #7dd3fc" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="#0369a1">
              New Project Details
            </Typography>
            <Button
              variant="contained"
              onClick={() => setCreateOpen((prev) => !prev)}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                bgcolor: "#0369a1",
                "&:hover": { bgcolor: "#025d8f" },
              }}
            >
              {createOpen ? "Close Form" : "Create Project"}
            </Button>
          </Box>

          <Collapse in={createOpen}>
            <form onSubmit={handleSubmit}>
              <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f0f9ff" }}>
              {/* Contract Info */}
              <SectionHeader label="Contract Information" />
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    id="project-name"
                    label="Project Name *"
                    value={form.projectName}
                    onChange={handleChange("projectName")}
                    fullWidth
                    required
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    id="contract-po-number"
                    label="Contract / P.O. No. *"
                    value={form.contractPoNumber}
                    onChange={handleChange("contractPoNumber")}
                    fullWidth
                    required
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    id="contract-po-date"
                    label="P.O. Date"
                    type="date"
                    value={form.contractPoDate}
                    onChange={handleChange("contractPoDate")}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    id="delivery-period-upto"
                    label="D.P. Upto"
                    type="date"
                    value={form.deliveryPeriodUpto}
                    onChange={handleChange("deliveryPeriodUpto")}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={4}>
                  <TextField
                    id="total-quantity"
                    label="Total Quantity in P.O."
                    value={form.totalQuantity}
                    onChange={handleChange("totalQuantity")}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={4}>
                  <TextField
                    id="contract-placed-by"
                    label="Contract / P.O. Placed By"
                    value={form.contractPlacedBy}
                    onChange={handleChange("contractPlacedBy")}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ mb: 3 }} />

              {/* Wagon Details */}
              <SectionHeader label="Wagon Details" />
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    id="wagon-type-in-po"
                    label="Type of Wagon in P.O."
                    value={form.wagonTypeInPo}
                    onChange={handleChange("wagonTypeInPo")}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    id="wagon-manufacturer"
                    label="Wagon Manufacturer"
                    value={form.wagonManufacturer}
                    onChange={handleChange("wagonManufacturer")}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    id="wagon-type-offered"
                    label="Type of Wagon Offered (Optional)"
                    value={form.wagonTypeOffered}
                    onChange={handleChange("wagonTypeOffered")}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ mb: 3 }} />

              {/* Inspection Details */}
              <SectionHeader label="Inspection Details" />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                These fields are optional and can be added later if not available at project creation time.
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    id="wagons-offered-for-inspection"
                    label="No. of Wagons Offered for Inspection (Optional)"
                    value={form.wagonsOfferedForInspection}
                    onChange={handleChange("wagonsOfferedForInspection")}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    id="inspection-offer-date"
                    label="Inspection Offer Date (Optional)"
                    type="date"
                    value={form.inspectionOfferDate}
                    onChange={handleChange("inspectionOfferDate")}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: "white", borderRadius: 1 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ mb: 3 }} />

              {/* Notes */}
              <SectionHeader label="Notes" />
              <TextField
                id="project-notes"
                label="Notes"
                value={form.notes}
                onChange={handleChange("notes")}
                fullWidth
                multiline
                rows={3}
                sx={{ bgcolor: "white", borderRadius: 1, mb: 3 }}
              />

              {/* Submit */}
              <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" } }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    px: 5,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: "1rem",
                    bgcolor: "#0369a1",
                    "&:hover": { bgcolor: "#025d8f" },
                    "&:disabled": { bgcolor: "#ccc" },
                    boxShadow: "0 4px 14px rgba(3,105,161,0.35)",
                  }}
                >
                  {saving ? "Creating…" : "Create Project"}
                </Button>
              </Box>
              </Box>
            </form>
          </Collapse>
        </Paper>
      ) : (
        <Alert
          severity="info"
          sx={{ mb: 3, borderRadius: 2 }}
        >
          Project creation is reserved for admin. Quality inspectors can use the First Zone and Second Zone screens with the available project list.
        </Alert>
      )}

      {/* ── Existing Projects ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Existing Projects
        </Typography>
        <Chip
          size="small"
          label={projects.length}
          sx={{ bgcolor: "#0369a1", color: "white", fontWeight: 700 }}
        />
      </Box>

      {projects.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: 3,
            border: "1.5px dashed #ccc",
          }}
        >
          <Typography sx={{ fontSize: 32, mb: 1 }}>📂</Typography>
          <Typography color="text.secondary">No wagon data sheet projects created yet.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => {
            const total = project.totalRows || 0;
            const completed = project.completedRows || 0;
            const pending = project.pendingRows || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Grid item xs={12} sm={6} lg={4} key={project._id}>
                <Paper
                  elevation={0}
                  onClick={() => role === "admin" && navigate(`/quality/wagon-data-sheet/projects/${project._id}`)}
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    border: "1.5px solid #bae6fd",
                    bgcolor: "#f0f9ff",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    cursor: role === "admin" ? "pointer" : "default",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                    "&:hover": role === "admin"
                      ? {
                          transform: "translateY(-2px)",
                          boxShadow: "0 12px 28px rgba(3,105,161,0.12)",
                          borderColor: "#38bdf8",
                        }
                      : {},
                  }}
                >
                  {/* Project Name */}
                  <Box>
                    <Typography fontWeight={800} fontSize="0.95rem" sx={{ lineHeight: 1.3 }}>
                      {project.projectName || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[project.contractPoNumber, project.wagonTypeOffered].filter(Boolean).join(" · ") || "—"}
                    </Typography>
                  </Box>

                  <Divider />

                  {/* Stats row */}
                  <Stack direction="row" justifyContent="space-around" divider={<Divider orientation="vertical" flexItem />}>
                    <StatBadge label="Offered" value={project.wagonsOfferedForInspection || "—"} />
                    <StatBadge label="1st Zone" value={total} color="#0369a1" />
                    <StatBadge label="Completed" value={completed} color="#15803d" />
                    <StatBadge label="Pending" value={pending} color={pending > 0 ? "#b45309" : "text.secondary"} />
                  </Stack>

                  {/* Progress bar */}
                  {total > 0 && (
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">2nd Zone Progress</Typography>
                        <Typography variant="caption" fontWeight={700} color="#15803d">{progress}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: "#e0f2fe",
                          "& .MuiLinearProgress-bar": { bgcolor: "#15803d", borderRadius: 3 },
                        }}
                      />
                    </Box>
                  )}

                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.5 }}>
                    {project.finalPendingRows > 0 ? (
                      <Chip
                        label={`3rd Zone Pending (${project.finalPendingRows})`}
                        clickable
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/quality/wagon-data-sheet/final-details?projectId=${project._id}`);
                        }}
                        sx={{
                          bgcolor: "#fff7ed",
                          color: "#c2410c",
                          border: "1px solid #fdba74",
                          fontWeight: 700,
                        }}
                      />
                    ) : project.finalCompletedRows > 0 ? (
                      <Chip
                        label="3rd Zone Complete"
                        sx={{
                          bgcolor: "#ecfdf5",
                          color: "#15803d",
                          border: "1px solid #86efac",
                          fontWeight: 700,
                        }}
                      />
                    ) : (
                      <Chip
                        label="3rd Zone Not Started"
                        sx={{
                          bgcolor: "#f8fafc",
                          color: "#64748b",
                          border: "1px solid #cbd5e1",
                          fontWeight: 700,
                        }}
                      />
                    )}

                    {role === "admin" && (
                      <Typography variant="caption" color="#0369a1" fontWeight={700}>
                        Click to open full table view
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
