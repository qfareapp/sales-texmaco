import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
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

const searchFields = [
  { value: "texNo", label: "TEX No." },
  { value: "wheelDataLink", label: "Wheel Data Link" },
  { value: "axleSerialNo", label: "Axle Serial No." },
  { value: "wheelSerialNo", label: "Wheel Serial No." },
  { value: "bearingSerialNo", label: "Bearing Serial No." },
  { value: "bogieSerialNo", label: "Bogie Serial No." },
  { value: "couplerSerialNo", label: "Coupler Serial No." },
  { value: "draftGearSerialNo", label: "Draft Gear Serial No." },
  { value: "dvSerialNo", label: "DV Serial No." },
  { value: "bcSerialNo", label: "BC Serial No." },
  { value: "arSerialNo", label: "AR Serial No." },
  { value: "wagonNo", label: "Wagon No." },
];

const formatFilled = (form) => {
  if (!form?.filledOn) return "Not filled";
  const date = new Date(form.filledOn);
  const dateText = Number.isNaN(date.getTime())
    ? String(form.filledOn)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `${dateText} | ${form.filledBy || "-"}`;
};

export default function WagonDataSheetSearch() {
  const [field, setField] = useState("texNo");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError("");
      return undefined;
    }

    let isCurrent = true;
    setLoading(true);
    setError("");
    const timeoutId = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/wagon-data-sheet/rows/search", { params: { field, query: value } });
        if (!isCurrent) return;
        setResults(data?.data || []);
        setSearched(true);
      } catch (err) {
        if (!isCurrent) return;
        setResults([]);
        setSearched(false);
        setError(err.response?.data?.message || "Search failed. Please try again.");
      } finally {
        if (isCurrent) setLoading(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [field, query]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1800, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: "#0f766e", color: "white", display: "grid", placeItems: "center", fontWeight: 900, fontSize: "1.25rem" }}>S</Box>
        <Box>
          <Typography variant="h5" fontWeight={800}>Wagon Data Search</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
            Search all inspector entries
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: { xs: 0, sm: 7 } }}>
        Search submitted CTRB, DM Line, and DM Final data across all projects and inspectors.
      </Typography>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, borderRadius: 3, border: "1.5px solid #99f6e4", bgcolor: "#f0fdfa" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="stretch">
          <TextField select label="Search By" value={field} onChange={(event) => setField(event.target.value)} sx={{ minWidth: { md: 250 }, bgcolor: "white", borderRadius: 1 }}>
            {searchFields.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </TextField>
          <TextField label="Enter number, TEX No., or data link" value={query} onChange={(event) => setQuery(event.target.value)} fullWidth autoFocus sx={{ bgcolor: "white", borderRadius: 1 }} />
          <Button type="button" variant="outlined" onClick={() => setQuery("")} disabled={!query} sx={{ minWidth: { md: 130 }, textTransform: "none", fontWeight: 800, color: "#0f766e", borderColor: "#0f766e" }}>
            Clear
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mt: 1.25 }}>
          {loading ? "Searching matching records..." : "Results update automatically as you type."}
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {searched && <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ mb: 1.25 }}>{results.length} matching record{results.length === 1 ? "" : "s"} found</Typography>}

      <Paper elevation={0} sx={{ borderRadius: 3, overflow: "hidden", border: "1.5px solid #e2e8f0" }}>
        <TableContainer sx={{ maxHeight: "65vh" }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1450 }}>
            <TableHead>
              <TableRow>
                {["Project", "SL / TEX / Wagon", "Wheel Data Link", "Axle Serial No.", "Wheel Serial No.", "Bearing Serial No.", "Bogie Serial No.", "CTRB Filled", "DM Line Filled", "DM Final Filled"].map((label) => (
                  <TableCell key={label} sx={{ fontWeight: 800, bgcolor: "#1e293b", color: "white", whiteSpace: "nowrap" }}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!searched ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 7, color: "text.secondary" }}>Select a field and enter a value to search all submitted wagon data.</TableCell></TableRow>
              ) : results.length === 0 ? (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 7, color: "text.secondary" }}>No matching data found.</TableCell></TableRow>
              ) : results.map((row) => (
                <TableRow key={row.rowId} hover>
                  <TableCell><Typography fontWeight={700}>{row.projectName}</Typography><Typography variant="caption" color="text.secondary">{row.projectPoNumber || "-"}</Typography></TableCell>
                  <TableCell><Typography fontWeight={800}>{row.texNo}</Typography><Typography variant="caption" display="block">SL: {row.slNo || "-"} | Wagon: {row.wagonNo}</Typography></TableCell>
                  <TableCell>{row.wheelDataLinks || "-"}</TableCell>
                  <TableCell>{row.axleSerialNumbers || "-"}</TableCell>
                  <TableCell>{row.wheelSerialNumbers || "-"}</TableCell>
                  <TableCell>{row.bearingSerialNumbers || "-"}</TableCell>
                  <TableCell>{row.bogieSerialNumbers || "-"}</TableCell>
                  <TableCell>{formatFilled(row.ctrb)}</TableCell>
                  <TableCell>{formatFilled(row.dmLine)}</TableCell>
                  <TableCell>{formatFilled(row.dmFinal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
