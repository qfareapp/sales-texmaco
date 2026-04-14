import React, { useState, useMemo } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import { addSalesPlan, addSalesAchievement } from "../../api/salesProd";

/* ------------------------------------------------------------------
   🔹 Sales Production Data Entry Form
   - Allows monthly entry of Plan and Achieved data
   - Segment: IR / Pvt
   - Dynamically adjusts month list based on selected FY
------------------------------------------------------------------ */

const monthMap = {
  "2023-24": [
    "Apr'23", "May'23", "Jun'23", "Jul'23", "Aug'23", "Sep'23",
    "Oct'23", "Nov'23", "Dec'23", "Jan'24", "Feb'24", "Mar'24",
  ],
  "2024-25": [
    "Apr'24", "May'24", "Jun'24", "Jul'24", "Aug'24", "Sep'24",
    "Oct'24", "Nov'24", "Dec'24", "Jan'25", "Feb'25", "Mar'25",
  ],
  "2025-26": [
    "Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25",
    "Oct'25", "Nov'25", "Dec'25", "Jan'26", "Feb'26", "Mar'26",
  ],
};

export default function SalesProdEntryForm() {
  const [fy, setFy] = useState("2025-26");
  const [month, setMonth] = useState("");
  const [segment, setSegment] = useState("");
  const [plan, setPlan] = useState("");
  const [achieved, setAchieved] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [severity, setSeverity] = useState("success");

  const months = useMemo(() => monthMap[fy] || [], [fy]);

  const handleSubmit = async () => {
    if (!month || !segment || !plan) {
      setMsg("Please fill required fields");
      setSeverity("warning");
      setOpen(true);
      return;
    }

    try {
      await addSalesPlan({ fy, month, segment, plan: Number(plan) });
      if (achieved !== "")
        await addSalesAchievement({ fy, month, segment, achieved: Number(achieved) });

      setMsg("Data saved successfully");
      setSeverity("success");
      setOpen(true);
      setMonth("");
      setSegment("");
      setPlan("");
      setAchieved("");
    } catch (err) {
      console.error(err);
      setMsg("Error saving data. Please check server connection.");
      setSeverity("error");
      setOpen(true);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Sales Production Data Entry
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Enter monthly production plan and achievement for IR & Pvt segments.
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Financial Year"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
            >
              <MenuItem value="2023-24">2023-24</MenuItem>
              <MenuItem value="2024-25">2024-25</MenuItem>
              <MenuItem value="2025-26">2025-26</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {months.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Segment"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
            >
              <MenuItem value="IR">IR</MenuItem>
              <MenuItem value="Pvt">Pvt</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="number"
              label="Plan"
              fullWidth
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="number"
              label="Achieved"
              fullWidth
              value={achieved}
              onChange={(e) => setAchieved(e.target.value)}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box textAlign="right">
          <Button
            variant="contained"
            color="primary"
            sx={{ px: 4 }}
            onClick={handleSubmit}
          >
            Save
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={severity} onClose={() => setOpen(false)}>
          {msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
