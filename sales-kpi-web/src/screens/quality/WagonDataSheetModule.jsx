import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function WagonDataSheetModule() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "";
  const isGroundInspector = role === "ground-inspector";
  const isQualityModuleAdmin = role === "admin" || role === "quality-admin";

  const actions = [
    isQualityModuleAdmin && {
      label: "Admin Overview",
      color: "info",
      onClick: () => navigate("/quality/wagon-data-sheet/overview"),
    },
    isQualityModuleAdmin && {
      label: "Project Setup",
      color: "primary",
      onClick: () => navigate("/quality/wagon-data-sheet/projects"),
    },
    isQualityModuleAdmin && {
      label: "Stage Dashboard",
      color: "success",
      onClick: () => navigate("/quality/wagon-data-sheet/stage-dashboard"),
    },
    isGroundInspector && {
      label: "Stage Inspection Dashboard",
      color: "success",
      onClick: () => navigate("/quality/wagon-data-sheet/stage-dashboard"),
    },
    isGroundInspector && {
      label: "Zone 1 Form",
      color: "warning",
      onClick: () => navigate("/quality/wagon-data-sheet/first-zone"),
    },
    isGroundInspector && {
      label: "Zone 2 Form",
      color: "secondary",
      onClick: () => navigate("/quality/wagon-data-sheet/second-zone"),
    },
    isGroundInspector && {
      label: "Zone 3 Form",
      color: "info",
      onClick: () => navigate("/quality/wagon-data-sheet/final-details"),
    },
    isGroundInspector && {
      label: "My Filled Forms",
      color: "inherit",
      variant: "outlined",
      onClick: () => navigate("/quality/wagon-data-sheet/my-submissions"),
    },
  ].filter(Boolean);

  return (
    <Box sx={{ p: 3, background: "#eef2ff", minHeight: "100vh" }}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        WAGON DATA SHEET MODULE
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {isGroundInspector
          ? "Use the zone forms as before, or open the new stage inspection section."
          : "Open project setup or the stage dashboard for Wagon Data Sheet."}
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <Stack spacing={2}>
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant || "contained"}
              color={action.color}
              onClick={action.onClick}
              sx={{ textTransform: "none", fontWeight: 700, justifyContent: "flex-start" }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
