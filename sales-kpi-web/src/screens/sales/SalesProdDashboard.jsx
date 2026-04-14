import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
} from "@mui/material";
import { getSalesAnalytics } from "../../api/salesProd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function SalesProdDashboard() {
  const [fy, setFy] = useState("2025-26");
  const [compareFy, setCompareFy] = useState("2024-25");
  const [data, setData] = useState(null);

  useEffect(() => {
    getSalesAnalytics(fy, compareFy).then((res) => setData(res.data));
  }, [fy, compareFy]);

  // ✅ always define defaults so hooks are stable
  const KPIs = data?.KPIs || {};
  const monthly = data?.monthly || [];
  const quarterly = data?.quarterly || [];

  // ✅ Hooks must always exist
  const monthlyIR = useMemo(
    () => monthly.filter((x) => x.segment === "IR"),
    [monthly]
  );
  const monthlyPvt = useMemo(
    () => monthly.filter((x) => x.segment === "Pvt"),
    [monthly]
  );

  // ✅ conditional rendering happens *after* hooks
  if (!data)
    return (
      <Box p={3}>
        <Typography>Loading...</Typography>
      </Box>
    );

  return (
    <Box p={3}>
      {/* Header + Filters */}
      <Grid container alignItems="center" justifyContent="space-between" mb={2}>
        <Grid item>
          <Typography variant="h5" fontWeight="bold">
            Sales Production Analytics – FY {fy}
          </Typography>
        </Grid>

        {/* 🔹 FY & Comparison Filters */}
        <Grid item>
          <Box display="flex" gap={2}>
            <TextField
              select
              label="Select FY"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              size="small"
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="2023-24">2023-24</MenuItem>
              <MenuItem value="2024-25">2024-25</MenuItem>
              <MenuItem value="2025-26">2025-26</MenuItem>
            </TextField>

            <TextField
              select
              label="Compare with"
              value={compareFy}
              onChange={(e) => setCompareFy(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="2023-24">2023-24</MenuItem>
              <MenuItem value="2024-25">2024-25</MenuItem>
              <MenuItem value="2025-26">2025-26</MenuItem>
            </TextField>
          </Box>
        </Grid>
      </Grid>

      {/* KPI Cards */}
      <Grid container spacing={2} mt={1}>
        {[
          ["Total Plan", KPIs.totalPlan],
          ["Total Achieved", KPIs.totalAchieved],
          ["Achievement %", `${KPIs.achievementPercent}%`],
          ["IR Share", `${KPIs.irPercent}%`],
          ["Private Share", `${KPIs.pvtPercent}%`],
          ["YoY Plan Growth", `${KPIs.yoyPlanGrowth}%`],
          ["YoY Achievement Growth", `${KPIs.yoyAchGrowth}%`],
          ["Gap % vs Plan", `${KPIs.gapPercent}%`],
        ].map(([title, value], i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2">{title}</Typography>
              <Typography variant="h6" fontWeight="bold">
                {value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Overall Monthly Trend */}
      <Box mt={4}>
        <Typography variant="h6">Monthly Plan vs Achieved (Overall)</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthly}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="plan" stroke="#8884d8" name="Plan" />
            <Line type="monotone" dataKey="achieved" stroke="#82ca9d" name="Achieved" />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* 🔹 IR Segment Chart */}
      <Box mt={4}>
        <Typography variant="h6" color="primary">IR Segment – Monthly Trend</Typography>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyIR}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="plan" stroke="#1976d2" name="Plan (IR)" />
            <Line type="monotone" dataKey="achieved" stroke="#2e7d32" name="Achieved (IR)" />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* 🔹 Pvt Segment Chart */}
      <Box mt={4}>
        <Typography variant="h6" color="secondary">Private Segment – Monthly Trend</Typography>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyPvt}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="plan" stroke="#ab47bc" name="Plan (Pvt)" />
            <Line type="monotone" dataKey="achieved" stroke="#ff9800" name="Achieved (Pvt)" />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* Quarterly Summary */}
      <Box mt={4}>
        <Typography variant="h6">Quarterly Summary</Typography>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={quarterly}>
            <XAxis dataKey="quarter" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="plan" fill="#8884d8" name="Plan" />
            <Bar dataKey="achieved" fill="#82ca9d" name="Achieved" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Table */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6">Detailed Month-wise Data</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell>Segment</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Achieved</TableCell>
              <TableCell>%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {monthly.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.month}</TableCell>
                <TableCell>{r.segment}</TableCell>
                <TableCell>{r.plan}</TableCell>
                <TableCell>{r.achieved}</TableCell>
                <TableCell>{r.percent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
