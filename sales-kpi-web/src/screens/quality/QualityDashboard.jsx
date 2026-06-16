import React from "react";
import { Box, Chip, Grid, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const moduleStyles = {
  blue: { accent: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  orange: { accent: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  green: { accent: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  teal: { accent: "#0e7490", bg: "#ecfeff", border: "#a5f3fc" },
  grey: { accent: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
};

function ModuleCard({ icon, title, description, color = "blue", disabled, onClick }) {
  const style = moduleStyles[color] || moduleStyles.blue;

  return (
    <Paper
      elevation={0}
      onClick={disabled ? undefined : onClick}
      sx={{
        p: 2.25,
        height: "100%",
        borderRadius: 2.5,
        border: `1.5px solid ${disabled ? "#e2e8f0" : style.border}`,
        bgcolor: disabled ? "#f8fafc" : style.bg,
        display: "flex",
        alignItems: "flex-start",
        gap: 1.75,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        "&:hover": disabled
          ? {}
          : {
              transform: "translateY(-2px)",
              boxShadow: `0 12px 26px ${style.accent}26`,
              borderColor: style.accent,
            },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: 46,
          height: 46,
          borderRadius: 2,
          bgcolor: disabled ? "#e2e8f0" : style.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography fontWeight={800} fontSize="0.96rem" color={disabled ? "text.secondary" : "text.primary"}>
            {title}
          </Typography>
          {disabled && (
            <Chip
              size="small"
              label="Coming Soon"
              sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#e2e8f0", color: "#64748b" }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.4 }}>
          {description}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function QualityDashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const isGroundInspector = role === "ground-inspector";

  const modules = [
    !isGroundInspector && {
      key: "bogie-report",
      icon: "📊",
      title: "Bogie Inspection Report",
      description: "View consolidated bogie inspection reports across all wagons.",
      color: "blue",
      onClick: () => navigate("/bogie-inspection-report"),
    },
    {
      key: "bogie-form",
      icon: "🧰",
      title: "Bogie Inspection Form",
      description: "Record the bogie inspection checklist and measurements for a wagon.",
      color: "blue",
      onClick: () => navigate("/bogie-inspection-form"),
    },
    {
      key: "after-wheeling",
      icon: "⚙️",
      title: "After-Wheeling Inspection",
      description: "Capture post-wheeling inspection checks once bogies are wheeled.",
      color: "orange",
      onClick: () => navigate("/bogie-after-wheel-inspection"),
    },
    {
      key: "wagon-data-sheet",
      icon: "📄",
      title: "Wagon Data Sheet",
      description: "Enter wheel data, component data, and final assembly details across the three zones.",
      color: "green",
      onClick: () => navigate("/quality/wagon-data-sheet"),
    },
    isGroundInspector && {
      key: "my-forms",
      icon: "🗂️",
      title: "My Filled Forms",
      description: "Browse a read-only history of the wagon data sheet forms you've already submitted.",
      color: "teal",
      onClick: () => navigate("/quality/wagon-data-sheet/my-submissions"),
    },
    {
      key: "coupler",
      icon: "🔗",
      title: "Coupler Inspection",
      description: "Coupler checklist entry will be available here soon.",
      color: "grey",
      disabled: true,
    },
    {
      key: "draft-gear",
      icon: "🧱",
      title: "Draft Gear Inspection",
      description: "Draft gear checklist entry will be available here soon.",
      color: "grey",
      disabled: true,
    },
    {
      key: "wheel-set",
      icon: "🔩",
      title: "Wheel Set Inspection",
      description: "Wheel set checklist entry will be available here soon.",
      color: "grey",
      disabled: true,
    },
  ].filter(Boolean);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      {/* ── Page Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#1e3a8a",
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>🛠️</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            {isGroundInspector ? "Ground Inspector Portal" : "Quality Dashboard"}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Agarpara Works
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: { xs: 0, sm: 7 } }}>
        {isGroundInspector
          ? "Pick a module below to start an inspection or review what you've already submitted."
          : "Open inspection forms, reports, and wagon data sheet modules from here."}
      </Typography>

      {/* ── Module Grid ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {modules.map((module) => (
          <Grid item xs={12} sm={6} md={4} key={module.key}>
            <ModuleCard {...module} />
          </Grid>
        ))}
      </Grid>

      {/* ── Recent Inspection Records ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <Typography variant="subtitle2" fontWeight={700} color="#374151">
            Recent Inspection Records
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {isGroundInspector
              ? "Choose a quality module first. Opening Wagon Data Sheet will show the three form stages."
              : "Use the modules above to open inspection forms, reports, and wagon data sheet modules."}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
