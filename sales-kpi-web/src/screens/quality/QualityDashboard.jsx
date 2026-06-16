import React from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";

/**
 * QualityDashboard.jsx
 * Displays buttons for different inspection modules (Bogie, Coupler, Draft Gear, etc.)
 * For now, only Bogie Inspection button is active.
 */
export default function QualityDashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const isGroundInspector = role === "ground-inspector";

  return (
    <Box sx={{ p: 3, background: "#eef2ff", minHeight: "100vh" }}>
      {/* Header */}
      <Typography variant="h5" fontWeight={700} mb={2}>
        {isGroundInspector ? "GROUND INSPECTOR PORTAL – AGARPARA WORKS" : "QUALITY DASHBOARD – AGARPARA WORKS"}
      </Typography>

      {/* Button Panel */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          background: "#f8f9fa",
        }}
      >
        {!isGroundInspector && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/bogie-inspection-report")}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            🚆 Bogie Inspection Report
          </Button>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/bogie-inspection-form")}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          🧰 Bogie Inspection Form
        </Button>

        <Button
          variant="contained"
          color="warning"
          onClick={() => navigate("/bogie-after-wheel-inspection")}
          sx={{ textTransform: "none", fontWeight: 600, color: "#111" }}
        >
          ⚙️ After-Wheeling Inspection
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={() => navigate("/quality/wagon-data-sheet")}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          📄 Wagon Data Sheet
        </Button>

        {isGroundInspector ? (
          <Button
            variant="outlined"
            color="info"
            onClick={() => navigate("/quality/wagon-data-sheet/my-submissions")}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            My Filled Forms
          </Button>
        ) : null}

        <Button variant="outlined" disabled sx={{ textTransform: "none" }}>
          ⚙️ Coupler Inspection (Coming Soon)
        </Button>

        <Button variant="outlined" disabled sx={{ textTransform: "none" }}>
          🧱 Draft Gear Inspection (Coming Soon)
        </Button>

        <Button variant="outlined" disabled sx={{ textTransform: "none" }}>
          🔩 Wheel Set Inspection (Coming Soon)
        </Button>
      </Paper>

      {/* Placeholder for summary stats or reports */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Recent Inspection Records
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {isGroundInspector
            ? "Choose a quality module first. Opening Wagon Data Sheet will show the three form stages."
            : "Use the buttons above to open inspection forms, reports, and wagon data sheet modules."}
        </Typography>
      </Paper>
    </Box>
  );
}
