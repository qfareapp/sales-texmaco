import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api";

const initialForm = {
  wheelDataKey: "",
  wheelDia: "",
  wheelOrigin: "",
  axleMake: "",
  axleSerialNumbers: "",
  axleHeatNumbers: [],
  wheelMake: "",
  wheelSerialNumbers: "",
  wheelHeatNumbers: [],
  bearingMake: "",
  bearingSerialNumbers: "",
};

const normalizeWheelDataKey = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
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
const parseSerialNumberSlots = (value) => {
  const slots = String(value || "")
    .split(/\r?\n|,/)
    .map((item) => String(item || "").trim())
    .slice(0, 8);

  if (slots.length === 1 && !slots[0]) {
    return [];
  }

  return slots;
};
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
const serialNumberFields = [
  ["axle", "Axle"],
  ["wheel", "Wheel"],
  ["bearing", "Bearing"],
];

function SectionHeader({ label, color = "#b45309" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: color }} />
      <Typography
        variant="subtitle2"
        fontWeight={700}
        color={color}
        sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: `${color}30`, ml: 1 }} />
    </Box>
  );
}

function ComponentRow({ keyName, label, form, handleChange }) {
  const serialNumberSlots = parseSerialNumberSlots(form[`${keyName}SerialNumbers`]);
  const heatFieldName = `${keyName}HeatNumbers`;
  const supportsHeatNumbers = keyName === "axle" || keyName === "wheel";

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(234,179,8,0.3)",
      }}
    >
      <Box>
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          {label}
        </Typography>
        <TextField
          label="Make"
          value={form[`${keyName}Make`]}
          onChange={handleChange(`${keyName}Make`)}
          fullWidth
          size="small"
          sx={{ bgcolor: "white", borderRadius: 1 }}
        />
      </Box>
      <Box>
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          {label} Serial Numbers
        </Typography>
        <TextField
          label="Sl. No. (up to 8)"
          value={form[`${keyName}SerialNumbers`]}
          onChange={handleChange(`${keyName}SerialNumbers`)}
          fullWidth
          size="small"
          multiline
          minRows={2}
          helperText="One per line. Values must be unique within this field."
          sx={{ bgcolor: "white", borderRadius: 1 }}
        />
        {supportsHeatNumbers && serialNumberSlots.length > 0 ? (
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {serialNumberSlots.map((serialNumber, index) => (
              <TextField
                key={`${keyName}-heat-${index}`}
                label={serialNumber ? `Heat No. for ${serialNumber}` : `Heat No. for ${label} Serial No. ${index + 1}`}
                value={form[heatFieldName]?.[index] || ""}
                onChange={handleChange(heatFieldName, index)}
                fullWidth
                size="small"
                helperText="Optional"
                sx={{ bgcolor: "white", borderRadius: 1 }}
              />
            ))}
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}

export default function WagonDataSheetSecondZoneForm() {
  const role = localStorage.getItem("role") || "";
  const submittedByUsername = localStorage.getItem("username") || "";
  const submittedByRole = localStorage.getItem("role") || "";
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const heatNumberFieldsBySerialField = {
    axleSerialNumbers: "axleHeatNumbers",
    wheelSerialNumbers: "wheelHeatNumbers",
  };

  const handleChange = (field, index = null) => (event) =>
    setForm((prev) => {
      const nextValue = event.target.value;

      if (heatNumberFieldsBySerialField[field]) {
        const serialNumbers = parseSerialNumberSlots(nextValue);
        const heatFieldName = heatNumberFieldsBySerialField[field];
        const nextHeatNumbers = serialNumbers.map(
          (_, heatIndex) => prev[heatFieldName]?.[heatIndex] || ""
        );
        return {
          ...prev,
          [field]: nextValue,
          [heatFieldName]: nextHeatNumbers,
        };
      }

      if ((field === "axleHeatNumbers" || field === "wheelHeatNumbers") && index !== null) {
        const nextHeatNumbers = [...(prev[field] || [])];
        nextHeatNumbers[index] = nextValue;
        return { ...prev, [field]: nextHeatNumbers };
      }

      return { ...prev, [field]: nextValue };
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      for (const [key, label] of serialNumberFields) {
        const duplicateSerialNumber = findDuplicateSerialNumber(form[`${key}SerialNumbers`]);
        if (duplicateSerialNumber) {
          throw new Error(`${label} serial numbers must be unique within the same field. Duplicate serial number: ${duplicateSerialNumber}`);
        }
      }

      await api.post("/wagon-data-sheet/rows/second-zone", {
        ...form,
        wheelDataKey: normalizeWheelDataKey(form.wheelDataKey),
        submittedByUsername,
        submittedByRole,
      });
      setSuccess(
        `First zone wheel data saved successfully. Wheel Data Link: ${normalizeWheelDataKey(form.wheelDataKey)}`
      );
      setForm(initialForm);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to save second zone row.");
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
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            bgcolor: "#b45309",
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
            First Zone Entry
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 7 }}>
        Inspectors can fill wheel data independently here before the project-based second zone is done.
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

      <form onSubmit={handleSubmit}>
        <Paper
          elevation={0}
          sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #fcd34d", overflow: "hidden" }}
        >
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#fef9c3", borderBottom: "1px solid #fcd34d" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#b45309">
              Wheel Assembly Data
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#fffdf0" }}>
            <SectionHeader label="Wheel Data Identification" color="#b45309" />
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Wheel Data Link"
                value={form.wheelDataKey}
                onChange={handleChange("wheelDataKey")}
                fullWidth
                required
                size="small"
                helperText="The combination of Wheel Data Link, Wheel Dia, and Make must be unique. The same link can be reused with a different dia or make."
                sx={{ bgcolor: "white", borderRadius: 1 }}
              />
            </Box>
            <Box
              sx={{
                mb: 3,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                select
                label="Wheel Dia"
                value={form.wheelDia}
                onChange={handleChange("wheelDia")}
                fullWidth
                size="small"
                sx={{ bgcolor: "white", borderRadius: 1 }}
              >
                <MenuItem value="">Select wheel dia</MenuItem>
                <MenuItem value="1000">1000</MenuItem>
                <MenuItem value="840">840</MenuItem>
                <MenuItem value="800">800</MenuItem>
              </TextField>
              <TextField
                select
                label="Make"
                value={form.wheelOrigin}
                onChange={handleChange("wheelOrigin")}
                fullWidth
                size="small"
                sx={{ bgcolor: "white", borderRadius: 1 }}
              >
                <MenuItem value="">Select make</MenuItem>
                <MenuItem value="India">India</MenuItem>
                <MenuItem value="China">China</MenuItem>
              </TextField>
            </Box>

            <SectionHeader label="Components" color="#b45309" />
            <Stack spacing={2}>
              <ComponentRow keyName="axle" label="Axle" form={form} handleChange={handleChange} />
              <ComponentRow keyName="wheel" label="Wheel" form={form} handleChange={handleChange} />
              <ComponentRow keyName="bearing" label="Bearing" form={form} handleChange={handleChange} />
            </Stack>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{ mb: 3, borderRadius: 3, border: "1.5px solid #cbd5e1", overflow: "hidden" }}
        >
          <Box sx={{ px: 3, py: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #d1d5db" }}>
            <Typography variant="subtitle2" fontWeight={700} color="#374151">
              Next Stage
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="body2" color="text.secondary">
              Once second-zone data is saved, the final details screen can use the same shared wagon row.
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" }, mb: 4 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || !normalizeWheelDataKey(form.wheelDataKey)}
            sx={{
              width: { xs: "100%", sm: "auto" },
              px: 5,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: "1rem",
              bgcolor: "#b45309",
              "&:hover": { bgcolor: "#92400e" },
              "&:disabled": { bgcolor: "#ccc" },
              boxShadow: "0 4px 14px rgba(180,83,9,0.35)",
            }}
          >
            {saving ? "Saving..." : "Save First Zone Wheel Data"}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
