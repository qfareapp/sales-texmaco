import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api";
import { buildProjectLabel, wagonConfigurationOptions } from "./wagonDataSheetConfig";

const initialForm = {
  projectId: "",
  rowId: "",
  texNo: "",
  wagonNo: "",
  wagonConfiguration: "",
  bogieMake: "",
  bogie1SerialNumber: "",
  bogie1WheelDiaFilter: "",
  bogie1WheelOriginFilter: "",
  bogie1WheelDataRowId1: "",
  bogie1WheelDataRowId2: "",
  bogie2SerialNumber: "",
  bogie2WheelDiaFilter: "",
  bogie2WheelOriginFilter: "",
  bogie2WheelDataRowId1: "",
  bogie2WheelDataRowId2: "",
  couplerMake: "",
  couplerSerialNumbers: "",
  draftGearMake: "",
  draftGearSerialNumbers: "",
  dvMake: "",
  dvSerialNumbers: "",
  bcMake: "",
  bcSerialNumbers: "",
  arMake: "",
  arSerialNumbers: "",
  sabMake: "",
  atlMake: "",
  crfMake: "",
};

const pairFields = [
  ["coupler", "Coupler"],
  ["draftGear", "Draft Gear"],
  ["dv", "DV"],
  ["bc", "BC"],
  ["ar", "AR"],
];
const normalizeSerialNumber = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
const parseSerialNumbers = (value) =>
  String(value || "")
    .split(/\r?\n|,/)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
const findDuplicateSerialNumber = (value) => {
  const serialNumbers = parseSerialNumbers(value);
  const seen = new Set();

  for (const serialNumber of serialNumbers) {
    const normalizedValue = normalizeSerialNumber(serialNumber);
    if (seen.has(normalizedValue)) {
      return serialNumber;
    }
    seen.add(normalizedValue);
  }

  return "";
};

function SectionHeader({ label, color = "#2e7d32" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: color }} />
      <Typography variant="subtitle1" fontWeight={700} color={color}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: `${color}33`, ml: 1 }} />
    </Box>
  );
}

function ComponentRow({ keyName, label, form, handleChange }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: "rgba(255,255,255,0.6)",
        border: "1px solid rgba(146,208,80,0.3)",
      }}
    >
      <TextField
        label={`${label} Make`}
        value={form[`${keyName}Make`]}
        onChange={handleChange(`${keyName}Make`)}
        fullWidth
        size="small"
        sx={{ bgcolor: "white", borderRadius: 1 }}
      />
      <TextField
        label={`${label} Serial Numbers`}
        value={form[`${keyName}SerialNumbers`]}
        onChange={handleChange(`${keyName}SerialNumbers`)}
        fullWidth
        size="small"
        multiline
        minRows={2}
        helperText="One per line. Values must be unique within this field."
        sx={{ bgcolor: "white", borderRadius: 1 }}
      />
    </Box>
  );
}

const wheelDataFilterLabel = (row) => {
  const axle = row?.secondZone?.axle?.make || "-";
  const wheel = row?.secondZone?.wheel?.make || "-";
  const bearing = row?.secondZone?.bearing?.make || "-";
  const wheelDia = row?.secondZone?.wheelDia || "-";
  const wheelOrigin = row?.secondZone?.wheelOrigin || "-";
  return `${row.wheelDataKey || "-"} | Dia: ${wheelDia} | Make: ${wheelOrigin} | Axle: ${axle} | Wheel: ${wheel} | Bearing: ${bearing}`;
};

function BogiePanel({
  index,
  accentColor,
  serialLabel,
  serialValue,
  onSerialChange,
  wheelDiaValue,
  onWheelDiaChange,
  wheelMakeValue,
  onWheelMakeChange,
  links,
}) {
  const fieldSx = { bgcolor: "#fafbfa", borderRadius: 1 };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: `${accentColor}40`,
        bgcolor: "white",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": { boxShadow: "0 6px 20px rgba(0,0,0,0.08)", borderColor: accentColor },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: accentColor,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          {index}
        </Box>
        <Box>
          <Typography fontWeight={700} lineHeight={1.2}>
            Bogie {index}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Serial &amp; wheel data linking
          </Typography>
        </Box>
      </Stack>

      <TextField
        label={serialLabel}
        value={serialValue}
        onChange={onSerialChange}
        fullWidth
        size="small"
        sx={{ mb: 2.5, ...fieldSx }}
      />

      <Typography
        variant="overline"
        sx={{ color: "text.secondary", letterSpacing: 0.5, display: "block", mb: 1 }}
      >
        Filters (optional)
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 0.5 }}>
        <TextField
          select
          label="Wheel Dia Filter"
          value={wheelDiaValue}
          onChange={onWheelDiaChange}
          fullWidth
          size="small"
          sx={fieldSx}
        >
          <MenuItem value="">All wheel dia</MenuItem>
          <MenuItem value="1000">1000</MenuItem>
          <MenuItem value="840">840</MenuItem>
          <MenuItem value="800">800</MenuItem>
        </TextField>
        <TextField
          select
          label="Wheel Make Filter"
          value={wheelMakeValue}
          onChange={onWheelMakeChange}
          fullWidth
          size="small"
          sx={fieldSx}
        >
          <MenuItem value="">All wheel make</MenuItem>
          <MenuItem value="India">India</MenuItem>
          <MenuItem value="China">China</MenuItem>
        </TextField>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
        Narrows the linked wheel data suggestions below
      </Typography>

      <Typography
        variant="overline"
        sx={{ color: "text.secondary", letterSpacing: 0.5, display: "block", mb: 1 }}
      >
        Linked Wheel Data
      </Typography>
      <Stack spacing={2}>
        {links.map((link, linkIndex) => (
          <WheelDataAutocomplete
            key={link.label || linkIndex}
            label={link.label}
            value={link.value}
            onChange={link.onChange}
            options={link.options}
            helperText={`Select ${link.label.toLowerCase()} entry`}
          />
        ))}
      </Stack>
    </Paper>
  );
}

function WheelDataAutocomplete({
  label,
  helperText,
  value,
  options,
  onChange,
}) {
  const selectedOption = options.find((row) => row._id === value) || null;

  return (
    <Autocomplete
      options={options}
      value={selectedOption}
      onChange={(_event, option) => onChange(option?._id || "")}
      getOptionLabel={(option) => wheelDataFilterLabel(option)}
      isOptionEqualToValue={(option, currentValue) => option._id === currentValue._id}
      filterOptions={(availableOptions, state) => {
        const search = String(state.inputValue || "").trim().toLowerCase();
        if (!search) {
          return availableOptions.slice(0, 5);
        }

        return availableOptions.filter((option) =>
          wheelDataFilterLabel(option).toLowerCase().includes(search)
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          size="small"
          helperText={helperText}
        />
      )}
    />
  );
}

export default function WagonDataSheetFirstZoneForm() {
  const role = localStorage.getItem("role") || "";
  const submittedByUsername = localStorage.getItem("username") || "";
  const submittedByRole = localStorage.getItem("role") || "";
  const [projects, setProjects] = useState([]);
  const [availableWheelData, setAvailableWheelData] = useState([]);
  const [eligibleTexRows, setEligibleTexRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedWheelIds = useMemo(
    () =>
      [
        form.bogie1WheelDataRowId1,
        form.bogie1WheelDataRowId2,
        form.bogie2WheelDataRowId1,
        form.bogie2WheelDataRowId2,
      ].filter(Boolean),
    [
      form.bogie1WheelDataRowId1,
      form.bogie1WheelDataRowId2,
      form.bogie2WheelDataRowId1,
      form.bogie2WheelDataRowId2,
    ]
  );

  const fetchProjects = async () => {
    const { data } = await api.get("/wagon-data-sheet/projects");
    setProjects(data?.data || []);
  };

  const fetchAvailableWheelData = async () => {
    const { data } = await api.get("/wagon-data-sheet/rows/available-wheel-data");
    setAvailableWheelData(data?.data || []);
  };
  const fetchEligibleTexRows = async (projectId) => {
    if (!projectId) {
      setEligibleTexRows([]);
      return;
    }
    const { data } = await api.get("/wagon-data-sheet/rows/pending-second-zone", {
      params: { projectId },
    });
    setEligibleTexRows(data?.data || []);
  };

  useEffect(() => {
    Promise.all([fetchProjects(), fetchAvailableWheelData()]).catch(() =>
      setError("Failed to load projects or available wheel data.")
    );
  }, []);

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  useEffect(() => {
    fetchEligibleTexRows(form.projectId).catch(() =>
      setError("Failed to load TEX numbers that completed DM Line.")
    );
  }, [form.projectId]);

  const handleWheelDataSelect = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleTexRowChange = (event) => {
    const rowId = event.target.value;
    const selectedRow = eligibleTexRows.find((row) => row._id === rowId);
    setForm((prev) => ({
      ...prev,
      rowId,
      texNo: selectedRow?.texNo || "",
      wagonNo: selectedRow?.wagonNo || prev.wagonNo,
      wagonConfiguration: selectedRow?.wagonConfiguration || prev.wagonConfiguration,
    }));
  };

  const getWheelOptions = (currentValue, wheelDiaFilter = "", wheelOriginFilter = "") =>
    availableWheelData.filter((row) => {
      const matchesSelectedState = !selectedWheelIds.includes(row._id) || row._id === currentValue;
      if (!matchesSelectedState) {
        return false;
      }

      if (row._id === currentValue) {
        return true;
      }

      const matchesWheelDia = !wheelDiaFilter || String(row?.secondZone?.wheelDia || "") === wheelDiaFilter;
      const matchesWheelOrigin =
        !wheelOriginFilter || String(row?.secondZone?.wheelOrigin || "") === wheelOriginFilter;

      return matchesWheelDia && matchesWheelOrigin;
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      for (const [key, label] of pairFields) {
        const duplicateSerialNumber = findDuplicateSerialNumber(form[`${key}SerialNumbers`]);
        if (duplicateSerialNumber) {
          throw new Error(`${label} serial numbers must be unique within the same field. Duplicate serial number: ${duplicateSerialNumber}`);
        }
      }

      await api.post("/wagon-data-sheet/rows/first-zone", {
        ...form,
        bogie1WheelDataRowIds: [form.bogie1WheelDataRowId1, form.bogie1WheelDataRowId2],
        bogie2WheelDataRowIds: [form.bogie2WheelDataRowId1, form.bogie2WheelDataRowId2],
        submittedByUsername,
        submittedByRole,
      });
      setSuccess("Second zone row saved successfully. Linked wheel data entries are now removed from the list.");
      setForm((prev) => ({ ...initialForm, projectId: prev.projectId }));
      await fetchEligibleTexRows(form.projectId);
      await fetchAvailableWheelData();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to save second zone row.";
      setError(message);
      if (/already filled/i.test(message)) {
        window.alert(message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (role !== "ground-inspector") {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">This Wagon Data Sheet form is available only for inspector accounts.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1150, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#1a6b3c",
            borderRadius: 2,
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "white", fontSize: 20, lineHeight: 1 }}>W</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>
            Wagon Data Sheet
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: "uppercase", letterSpacing: 1 }}
          >
            Second Zone Entry
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7 }}>
        Select a TEX number that already completed DM Line in stage inspection, then fill the rest of the wagon component details and link 2 first-zone wheel data entries to each bogie.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #b3d9f0", overflow: "hidden" }}>
        <Box sx={{ px: 3, py: 1.5, bgcolor: "#e3f4fd", borderBottom: "1px solid #b3d9f0" }}>
          <Typography variant="subtitle2" fontWeight={700} color="#0369a1">
            Project Selection
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <TextField
            id="second-zone-project"
            select
            label="Select Project"
            value={form.projectId}
            onChange={handleChange("projectId")}
            fullWidth
            required
            helperText="Choose the wagon project before linking component data"
          >
            {projects.map((project) => (
              <MenuItem key={project._id} value={project._id}>
                {buildProjectLabel(project)}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      <form onSubmit={handleSubmit}>
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #92d050", overflow: "hidden" }}>
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#e7f6dd", borderBottom: "1px solid #92d050" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#2e7d32">
              Wagon Identification and Component Data
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f5fbf0" }}>
            <SectionHeader label="Wagon Identification" color="#2e7d32" />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  label="TEX No."
                  value={form.rowId}
                  onChange={handleTexRowChange}
                  fullWidth
                  size="small"
                  required
                  helperText={!form.projectId ? "Select a project first" : "Only TEX numbers that reached DM Line are listed here"}
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                >
                  {eligibleTexRows.map((row) => (
                    <MenuItem key={row._id} value={row._id}>
                      {row.texNo || "-"}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Wagon No."
                  value={form.wagonNo}
                  onChange={handleChange("wagonNo")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Configuration"
                  value={form.wagonConfiguration}
                  onChange={handleChange("wagonConfiguration")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                >
                  {wagonConfigurationOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <SectionHeader label="Bogie and Wheel Data Linking" color="#2e7d32" />
            <Stack spacing={2} sx={{ mb: 3 }}>
              <TextField
                label="Bogie Make"
                value={form.bogieMake}
                onChange={handleChange("bogieMake")}
                fullWidth
                size="small"
                sx={{ bgcolor: "white", borderRadius: 1 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <BogiePanel
                    index={1}
                    accentColor="#2e7d32"
                    serialLabel="Bogie 1 Serial No."
                    serialValue={form.bogie1SerialNumber}
                    onSerialChange={handleChange("bogie1SerialNumber")}
                    wheelDiaValue={form.bogie1WheelDiaFilter}
                    onWheelDiaChange={handleChange("bogie1WheelDiaFilter")}
                    wheelMakeValue={form.bogie1WheelOriginFilter}
                    onWheelMakeChange={handleChange("bogie1WheelOriginFilter")}
                    links={[
                      {
                        label: "Axle 1 Wheel Data",
                        value: form.bogie1WheelDataRowId1,
                        onChange: handleWheelDataSelect("bogie1WheelDataRowId1"),
                        options: getWheelOptions(
                          form.bogie1WheelDataRowId1,
                          form.bogie1WheelDiaFilter,
                          form.bogie1WheelOriginFilter
                        ),
                      },
                      {
                        label: "Axle 2 Wheel Data",
                        value: form.bogie1WheelDataRowId2,
                        onChange: handleWheelDataSelect("bogie1WheelDataRowId2"),
                        options: getWheelOptions(
                          form.bogie1WheelDataRowId2,
                          form.bogie1WheelDiaFilter,
                          form.bogie1WheelOriginFilter
                        ),
                      },
                    ]}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <BogiePanel
                    index={2}
                    accentColor="#00695c"
                    serialLabel="Bogie 2 Serial No."
                    serialValue={form.bogie2SerialNumber}
                    onSerialChange={handleChange("bogie2SerialNumber")}
                    wheelDiaValue={form.bogie2WheelDiaFilter}
                    onWheelDiaChange={handleChange("bogie2WheelDiaFilter")}
                    wheelMakeValue={form.bogie2WheelOriginFilter}
                    onWheelMakeChange={handleChange("bogie2WheelOriginFilter")}
                    links={[
                      {
                        label: "Axle 1 Wheel Data",
                        value: form.bogie2WheelDataRowId1,
                        onChange: handleWheelDataSelect("bogie2WheelDataRowId1"),
                        options: getWheelOptions(
                          form.bogie2WheelDataRowId1,
                          form.bogie2WheelDiaFilter,
                          form.bogie2WheelOriginFilter
                        ),
                      },
                      {
                        label: "Axle 2 Wheel Data",
                        value: form.bogie2WheelDataRowId2,
                        onChange: handleWheelDataSelect("bogie2WheelDataRowId2"),
                        options: getWheelOptions(
                          form.bogie2WheelDataRowId2,
                          form.bogie2WheelDiaFilter,
                          form.bogie2WheelOriginFilter
                        ),
                      },
                    ]}
                  />
                </Grid>
              </Grid>
            </Stack>

            <SectionHeader label="Other Components" color="#2e7d32" />
            <Stack spacing={2}>
              {pairFields.map(([key, label]) => (
                <ComponentRow key={key} keyName={key} label={label} form={form} handleChange={handleChange} />
              ))}
            </Stack>

            <Box sx={{ my: 3, height: 1, bgcolor: "#d6ead2" }} />

            <SectionHeader label="Additional Components" color="#2e7d32" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="SAB Make"
                  value={form.sabMake}
                  onChange={handleChange("sabMake")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="ATL Make"
                  value={form.atlMake}
                  onChange={handleChange("atlMake")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="CRF Make"
                  value={form.crfMake}
                  onChange={handleChange("crfMake")}
                  fullWidth
                  size="small"
                  sx={{ bgcolor: "white", borderRadius: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        </Paper>

        <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" }, mb: 4 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || !form.projectId || selectedWheelIds.length !== 4}
            sx={{
              width: { xs: "100%", sm: "auto" },
              px: 5,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: "1rem",
              bgcolor: "#1a6b3c",
              "&:hover": { bgcolor: "#155730" },
              "&:disabled": { bgcolor: "#ccc" },
              boxShadow: "0 4px 14px rgba(26,107,60,0.35)",
            }}
          >
            {saving ? "Saving..." : "Save Second Zone Row"}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
