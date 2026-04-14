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

  return (
    <Box sx={{ p: 3, background: "#eef2ff", minHeight: "100vh" }}>
      {/* Header */}
      <Typography variant="h5" fontWeight={700} mb={2}>
        QUALITY DASHBOARD – AGARPARA WORKS
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
        <Button
  variant="contained"
  color="primary"
  onClick={() => navigate("/bogie-inspection-report")}
  sx={{ textTransform: "none", fontWeight: 600 }}
>
  🚆 Bogie Inspection
</Button>

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
          Click “Bogie Inspection” to open detailed inspection entry screen.
          This dashboard will later show summary charts, compliance %,
          inspection history, and daily quality logs.
        </Typography>
      </Paper>
    </Box>
  );
}
