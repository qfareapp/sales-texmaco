import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import api from "../../api";

const textOrDash = (value) => (value ? String(value) : "-");
const joinValues = (values) => (Array.isArray(values) && values.filter(Boolean).length ? values.filter(Boolean).join(", ") : "-");
const joinAxleHeatPairs = (row) =>
  (row?.secondZone?.axle?.serialNumbers || [])
    .map((serialNumber, index) => {
      const heatNumber = String(row?.secondZone?.axleHeatNumbers?.[index] || "").trim();
      return heatNumber ? `${serialNumber} (${heatNumber})` : serialNumber;
    })
    .filter(Boolean)
    .join(", ") || "-";
const joinWheelHeatPairs = (row) =>
  (row?.secondZone?.wheel?.serialNumbers || [])
    .map((serialNumber, index) => {
      const heatNumber = String(row?.secondZone?.wheelHeatNumbers?.[index] || "").trim();
      return heatNumber ? `${serialNumber} (${heatNumber})` : serialNumber;
    })
    .filter(Boolean)
    .join(", ") || "-";
const formatTimestamp = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const zoneStyles = {
  "1st Zone": { accent: "#2e7d32", bg: "#e7f6dd", border: "#92d050" },
  "2nd Zone": { accent: "#b45309", bg: "#fef9c3", border: "#fcd34d" },
  "3rd Zone": { accent: "#4338ca", bg: "#e0e7ff", border: "#a5b4fc" },
};
const defaultZoneStyle = { accent: "#374151", bg: "#f3f4f6", border: "#d1d5db" };
const zoneOrder = ["1st Zone", "2nd Zone", "3rd Zone"];

const FIELD_COL_WIDTH = 124;
const ENTRY_COL_WIDTH = 200;
const HEADER_ROW_HEIGHT = 56;
const BODY_ROW_HEIGHT = 42;

function ZoneComparisonTable({ zone, entries }) {
  const style = zoneStyles[zone] || defaultZoneStyle;

  const fieldLabels = useMemo(() => {
    const labels = [];
    entries.forEach((entry) => {
      entry.summary.forEach(([label]) => {
        if (!labels.includes(label)) labels.push(label);
      });
    });
    return labels;
  }, [entries]);

  const valuesByEntry = useMemo(
    () => entries.map((entry) => Object.fromEntries(entry.summary)),
    [entries]
  );

  const bodyCellSx = {
    height: BODY_ROW_HEIGHT,
    display: "flex",
    alignItems: "center",
    px: 1.25,
    fontSize: "0.82rem",
    borderBottom: "1px solid #eee",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 2.5, border: `1.5px solid ${style.border}`, overflow: "hidden" }}
    >
      <Box
        sx={{
          px: { xs: 1.75, sm: 2.5 },
          py: 1.5,
          bgcolor: style.bg,
          borderBottom: `1px solid ${style.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography fontWeight={800} fontSize="0.98rem" color={style.accent}>
          {zone}
        </Typography>
        <Chip
          size="small"
          label={`${entries.length} submission${entries.length === 1 ? "" : "s"}`}
          sx={{ fontWeight: 700, bgcolor: style.accent, color: "white" }}
        />
      </Box>

      {entries.length > 1 && (
        <Box
          sx={{
            display: { xs: "block", sm: "none" },
            px: 1.75,
            py: 0.5,
            bgcolor: "#fffbeb",
            borderBottom: "1px solid #fde68a",
          }}
        >
          <Typography variant="caption" color="#92400e" fontWeight={600}>
            ⇆ Swipe to lock onto the next submission
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "flex" }}>
        {/* Field labels — fixed, outside the scroll/snap area */}
        <Box sx={{ flexShrink: 0, width: FIELD_COL_WIDTH, bgcolor: style.bg, borderRight: `1.5px solid ${style.border}` }}>
          <Box
            sx={{
              height: HEADER_ROW_HEIGHT,
              display: "flex",
              alignItems: "center",
              px: 1.25,
              fontWeight: 700,
              color: "text.secondary",
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              borderBottom: `1px solid ${style.border}`,
            }}
          >
            Field
          </Box>
          {fieldLabels.map((label, index) => (
            <Tooltip key={label} title={label} enterTouchDelay={400}>
              <Box
                sx={{
                  ...bodyCellSx,
                  bgcolor: index % 2 === 0 ? "white" : "#fafafa",
                  fontWeight: 700,
                  color: "text.secondary",
                }}
              >
                {label}
              </Box>
            </Tooltip>
          ))}
        </Box>

        {/* Entries — one snap point per submission; a swipe locks onto exactly one */}
        <Box
          sx={{
            display: "flex",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            flex: 1,
          }}
        >
          {entries.map((entry, columnIndex) => (
            <Box
              key={entry.id}
              sx={{
                flex: entries.length === 1 ? "1 1 auto" : `0 0 ${ENTRY_COL_WIDTH}px`,
                minWidth: ENTRY_COL_WIDTH,
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                borderRight: "1px solid #eee",
              }}
            >
              <Box
                sx={{
                  height: HEADER_ROW_HEIGHT,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  px: 1.25,
                  borderBottom: `1px solid ${style.border}`,
                  overflow: "hidden",
                }}
              >
                <Typography fontWeight={800} fontSize="0.85rem" noWrap>
                  {entry.projectName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {formatTimestamp(entry.submittedAt)}
                </Typography>
              </Box>
              {fieldLabels.map((label, index) => (
                <Tooltip key={label} title={textOrDash(valuesByEntry[columnIndex][label])} enterTouchDelay={400}>
                  <Box
                    sx={{
                      ...bodyCellSx,
                      bgcolor: index % 2 === 0 ? "white" : "#fafafa",
                      fontWeight: 600,
                    }}
                  >
                    {textOrDash(valuesByEntry[columnIndex][label])}
                  </Box>
                </Tooltip>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

export default function WagonDataSheetInspectorHistory() {
  const username = localStorage.getItem("username") || "";
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [wheelDataKeySearch, setWheelDataKeySearch] = useState("");
  const [entryDateFilter, setEntryDateFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/wagon-data-sheet/rows/submissions", {
          params: { username },
        });
        setRows(data?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load submitted forms.");
      } finally {
        setLoading(false);
      }
    };

    if (!username) {
      setError("Logged-in inspector username was not found.");
      setLoading(false);
      return;
    }

    load();
  }, [username]);

  const entries = useMemo(() => {
    return rows.flatMap((row) => {
      const items = [];

      if (row?.firstZone?.submittedBy?.username === username && row?.firstZone?.submittedAt) {
        items.push({
          id: `${row._id}-first-zone`,
          zone: "2nd Zone",
          submittedAt: row.firstZone.submittedAt,
          projectName: row?.project?.projectName || "-",
          summary: [
            ["Project", row?.project?.projectName],
            ["TEX No.", row?.texNo],
            ["Wagon No.", row?.wagonNo],
            ["Configuration", row?.wagonConfiguration],
            ["Bogie Make", row?.firstZone?.bogie?.make],
            ["Bogie Serial Nos.", joinValues([row?.firstZone?.bogie1SerialNumber, row?.firstZone?.bogie2SerialNumber])],
            ["Linked Wheel Data", joinValues([
              ...(row?.firstZone?.bogie1WheelDataRows || []).map((item) => item?.wheelDataKey),
              ...(row?.firstZone?.bogie2WheelDataRows || []).map((item) => item?.wheelDataKey),
            ])],
            ["Coupler Serial Nos.", joinValues(row?.firstZone?.coupler?.serialNumbers)],
            ["Draft Gear Serial Nos.", joinValues(row?.firstZone?.draftGear?.serialNumbers)],
            ["DV Serial Nos.", joinValues(row?.firstZone?.dv?.serialNumbers)],
            ["BC Serial Nos.", joinValues(row?.firstZone?.bc?.serialNumbers)],
            ["AR Serial Nos.", joinValues(row?.firstZone?.ar?.serialNumbers)],
          ],
        });
      }

      if (row?.secondZone?.submittedBy?.username === username && row?.secondZone?.submittedAt) {
        items.push({
          id: `${row._id}-second-zone`,
          zone: "1st Zone",
          submittedAt: row.secondZone.submittedAt,
          projectName: row?.project?.projectName || "Independent Wheel Data",
          summary: [
            ["Project", row?.project?.projectName || "Independent Wheel Data"],
            ["Wheel Data Key", row?.wheelDataKey],
            ["Axle Make", row?.secondZone?.axle?.make],
            ["Axle Serial Nos.", joinValues(row?.secondZone?.axle?.serialNumbers)],
            ["Axle Heat Nos.", joinAxleHeatPairs(row)],
            ["Wheel Make", row?.secondZone?.wheel?.make],
            ["Wheel Serial Nos.", joinValues(row?.secondZone?.wheel?.serialNumbers)],
            ["Wheel Heat Nos.", joinWheelHeatPairs(row)],
            ["Bearing Make", row?.secondZone?.bearing?.make],
            ["Bearing Serial Nos.", joinValues(row?.secondZone?.bearing?.serialNumbers)],
          ],
        });
      }

      if (row?.finalAssembly?.submittedBy?.username === username && row?.finalAssembly?.submittedAt) {
        items.push({
          id: `${row._id}-final-zone`,
          zone: "3rd Zone",
          submittedAt: row.finalAssembly.submittedAt,
          projectName: row?.project?.projectName || "-",
          summary: [
            ["Project", row?.project?.projectName],
            ["TEX No.", row?.texNo],
            ["Wagon No.", row?.wagonNo],
            ["Tare Weight", row?.finalAssembly?.tareWeight],
            ["Mfg. Date", row?.finalAssembly?.manufactureDate],
            ["TXR Fit Date", row?.finalAssembly?.txrFitDate],
            ["RFID Nos.", joinValues([row?.finalAssembly?.rfidNo1, row?.finalAssembly?.rfidNo2])],
            ["DM No.", row?.finalAssembly?.dmNo],
            ["DM Date", row?.finalAssembly?.dmDate],
            ["ROH Date", row?.finalAssembly?.rohDate],
            ["Return / POH Date", row?.finalAssembly?.returnOrPohDate],
          ],
        });
      }

      return items;
    }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [rows, username]);

  const zoneGroups = useMemo(() => {
    const search = wheelDataKeySearch.trim().toLowerCase();
    const filterDate = entryDateFilter.trim();
    const filteredEntries = search
      ? entries.filter((entry) =>
          entry.summary.some(
            ([label, value]) =>
              label === "Wheel Data Key" && String(value || "").toLowerCase().includes(search)
          )
        )
      : entries;
    const dateFilteredEntries = filterDate
      ? filteredEntries.filter((entry) => {
          const date = new Date(entry.submittedAt);
          if (Number.isNaN(date.getTime())) {
            return false;
          }
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, "0");
          const dd = String(date.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}` === filterDate;
        })
      : filteredEntries;

    const groups = {};
    dateFilteredEntries.forEach((entry) => {
      if (!groups[entry.zone]) groups[entry.zone] = [];
      groups[entry.zone].push(entry);
    });
    return zoneOrder
      .filter((zone) => groups[zone]?.length)
      .map((zone) => ({ zone, entries: groups[zone] }));
  }, [entries, wheelDataKeySearch, entryDateFilter]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      {/* ── Page Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#374151",
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>🗂️</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            My Filled Wagon Forms
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Submission History
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: { xs: 0, sm: 7 } }}>
        Read-only history of the wagon data sheet forms submitted by {username}.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {loading && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>Loading submitted forms…</Alert>}

      {!loading && !error && entries.length === 0 && (
        <Paper
          elevation={0}
          sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1.5px dashed #ccc" }}
        >
          <Typography sx={{ fontSize: 32, mb: 1 }}>🗂️</Typography>
          <Typography color="text.secondary">No submitted wagon data sheet forms were found for this inspector.</Typography>
        </Paper>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              label="Search Wheel Data Key"
              value={wheelDataKeySearch}
              onChange={(event) => setWheelDataKeySearch(event.target.value)}
              size="small"
              fullWidth
              sx={{ maxWidth: { xs: "100%", sm: 320 }, bgcolor: "white", borderRadius: 1 }}
              helperText="Filter submissions by wheel data key"
            />
            <TextField
              label="Filter By Entry Date"
              type="date"
              value={entryDateFilter}
              onChange={(event) => setEntryDateFilter(event.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ maxWidth: { xs: "100%", sm: 220 }, bgcolor: "white", borderRadius: 1 }}
              helperText="Filter by submission date"
            />
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              Total Submissions
            </Typography>
            <Chip size="small" label={entries.length} sx={{ bgcolor: "#374151", color: "white", fontWeight: 700 }} />
          </Box>

          {zoneGroups.length > 0 ? (
            <Stack spacing={2.5}>
              {zoneGroups.map(({ zone, entries: zoneEntries }) => (
                <ZoneComparisonTable key={zone} zone={zone} entries={zoneEntries} />
              ))}
            </Stack>
          ) : (
            <Paper
              elevation={0}
              sx={{ p: 3, textAlign: "center", borderRadius: 3, border: "1.5px dashed #ccc" }}
            >
              <Typography color="text.secondary">
                No submissions matched that wheel data key.
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
