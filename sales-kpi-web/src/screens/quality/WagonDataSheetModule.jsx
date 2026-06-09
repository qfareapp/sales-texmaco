import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function WagonDataSheetModule() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const isGroundInspector = role === "ground-inspector";

  return (
    <Box sx={{ p: 3, background: "#eef2ff", minHeight: "100vh" }}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        WAGON DATA SHEET MODULE
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Choose the stage you want to fill.
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <Stack spacing={2}>
          {!isGroundInspector && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/quality/wagon-data-sheet/projects")}
              sx={{ textTransform: "none", fontWeight: 700, justifyContent: "flex-start" }}
            >
              📋 Project Setup
            </Button>
          )}

          <Button
            variant="contained"
            color="success"
            onClick={() => navigate("/quality/wagon-data-sheet/first-zone")}
            sx={{ textTransform: "none", fontWeight: 700, justifyContent: "flex-start" }}
          >
            🟩 First Zone Form
          </Button>

          <Button
            variant="contained"
            color="warning"
            onClick={() => navigate("/quality/wagon-data-sheet/second-zone")}
            sx={{ textTransform: "none", fontWeight: 700, color: "#111", justifyContent: "flex-start" }}
          >
            🟨 Second Zone Form
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigate("/quality/wagon-data-sheet/final-details")}
            sx={{ textTransform: "none", fontWeight: 700, justifyContent: "flex-start" }}
          >
            🧾 Final Details Form
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
