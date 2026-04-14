import React, { useEffect, useMemo, useState } from "react";
import api from "../../api";
import "../../App.css";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { Checkbox } from "@mui/material";

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------- */
const todayISO = () => new Date().toISOString().slice(0, 10);

const toObject = (arr) => arr.reduce((o, k) => ({ ...o, [k]: false }), {});
const selectedFrom = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => !!v)
    .map(([k]) => k);

/* ------------------------------------------------------------
   Reusable checkbox group block
------------------------------------------------------------- */
const CheckGroup = ({ label, options, state, setState, cols = { xs: 12, sm: 6, md: 4 } }) => {
  const handle = (opt) => (e) => setState((s) => ({ ...s, [opt]: e.target.checked }));
  return (
    <Grid item xs={12}>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 5px rgba(0,0,0,0.08)" }}>
        <Typography fontWeight={700} sx={{ mb: 1 }}>
          {label}
        </Typography>
        <FormGroup>
          <Grid container spacing={1}>
            {options.map((opt) => (
              <Grid item key={opt} {...cols}>
                <FormControlLabel
                  control={<Checkbox checked={!!state[opt]} onChange={handle(opt)} size="small" />}
                  label={opt}
                  sx={{
                    "& input": { width: 18, height: 18, marginRight: 1, accentColor: "#1e88e5" },
                    "& .MuiFormControlLabel-label": { fontSize: "0.95rem" },
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </FormGroup>
      </Paper>
    </Grid>
  );
};

/* ------------------------------------------------------------
   Main: After-Wheeling Visual Inspection (per Bogie)
------------------------------------------------------------- */
export default function BogiePostWheelInspectionForm() {
  /* Header */
  const [date, setDate] = useState(todayISO());
const [bogieNo, setBogieNo] = useState("");
const [bogieOptions, setBogieOptions] = useState([]);
const [inspectorName, setInspectorName] = useState("");
const [inspectorSignature, setInspectorSignature] = useState(null);

/* ✅ Auto-fetch only bogies whose initial inspection is complete */
useEffect(() => {
  const fetchPendingBogies = async () => {
    try {
      const { data } = await api.get("/bogie-inspections/pending-after-wheeling");
      setBogieOptions(data?.bogieNumbers || []);
    } catch (err) {
      console.error("Error fetching pending bogie list:", err);
    }
  };
  fetchPendingBogies();
}, []);

  /* ------------------ Sections (all red text as checkboxes) ------------------ */
  const adapterFitmentOpts = [
    "In order",
    "Improper seating",
    "Twist",
    "Crack",
    "Distortion",
  ];
  const [adapterFitment, setAdapterFitment] = useState(toObject(adapterFitmentOpts));

  const springConditionOpts = [
    "Okay",
    "Loose",
    "Both outer & inner springs are in position",
    "Both outer & inner springs are not in position",
  ];
  const [springCondition, setSpringCondition] = useState(toObject(springConditionOpts));

  const springSeatingOpts = [
    "Inter Gaps Okay",
    "Inter Gaps not okay",
    "Springs seating Okay",
    "Springs seating Not Okay",
    "Gap more than 5 mm",
  ];
  const [springSeating, setSpringSeating] = useState(toObject(springSeatingOpts));

  const stopperConditionOpts = [
    "Okay",
    "Not Okay",
    "Damaged",
    "Rivets Crack",
    "Rivets Tight",
    "Sound",
    "Rivets Loose",
  ];
  const [stopperCondition, setStopperCondition] = useState(toObject(stopperConditionOpts));

  const [adopterType, setAdopterType] = useState(""); // E / K / B
  const adopterVisualOpts = ["Okay", "Damaged", "Tilted"];
  const [adopterVisual, setAdopterVisual] = useState(toObject(adopterVisualOpts));

  const emPadOpts = [
    "No Cracks",
    "Bend",
    "Misaligned",
    "Engagement proper",
    "Engagement improper",
    "Lugs - proper",
    "Lugs - improper",
  ];
  const [emPad, setEmPad] = useState(toObject(emPadOpts));

  const brakeBlockOpts = [
    "All 8 blocks fitted properly",
    "Block missing",
    "Surface okay",
    "Damaged",
    "Thick ≥10 mm",
    "Thick <10 mm",
  ];
  const [brakeBlock, setBrakeBlock] = useState(toObject(brakeBlockOpts));

  const wheelAdjOpts = [
    "Wheel Flange gaps Uniform",
    "Wheel Flange gaps Non uniform",
    "Proper gauging",
    "Improper Gauging",
    "Tilting",
    "No tilting",
    "Side shifted in bogie",
    "Side not shifted in Bogie",
  ];
  const [wheelAdj, setWheelAdj] = useState(toObject(wheelAdjOpts));

  const sideLinersOpts = [
    "No defect",
    "Cracks",
    "Wear",
    "Not Wear",
    "Thinning (<3 mm)",
    "Thinning (>3 mm)",
  ];
  const [sideLiners, setSideLiners] = useState(toObject(sideLinersOpts));

  const sideFrameCondOpts = [
    "No Surface defects",
    "Cracks",
    "Dents",
    "Blow Holes",
    "Gas cavities",
    "Corroded",
  ];
  const [sideFrameCond, setSideFrameCond] = useState(toObject(sideFrameCondOpts));

  const bolsterOpts = [
    "No Surface defects",
    "Cracks",
    "Dents",
    "Blow Holes",
    "Cavities",
    "Pocket deformed",
    "No deformation",
  ];
  const [bolster, setBolster] = useState(toObject(bolsterOpts));

  const [centerPivotType, setCenterPivotType] = useState(""); // Spherical / Flat

  const [sideBearerType, setSideBearerType] = useState(""); // "142.5 mm (3 rings)" / "Metal-bonded rubber pad: 114.0 mm"
  const sideBearerOpts = [
    "Surface: Crack",
    "Surface: No crack",
    "Locking arrangement intact",
    "Locking arrangement not intact",
    "Free rotational movement",
    "Jam in rotational movement",
  ];
  const [sideBearer, setSideBearer] = useState(toObject(sideBearerOpts));

  const frictionWedgeOpts = [
    "Proper seating",
    "Improper seating",
    "Vertical movement",
    "Inclined movement",
    "No excessive wear (<7 mm)",
    "Excessive wear (>7 mm)",
  ];
  const [frictionWedge, setFrictionWedge] = useState(toObject(frictionWedgeOpts));

  const springPlankOpts = [
    "Cracks",
    "Bend",
    "Rivets tight",
    "Rivets loose",
    "Bolts tight",
    "Bolts loose",
  ];
  const [springPlank, setSpringPlank] = useState(toObject(springPlankOpts));

  const hangerBracketOpts = [
    "Mounted properly",
    "Improper mounted",
    "Pins present and locked",
    "Pins Not available",
  ];
  const [hangerBrackets, setHangerBrackets] = useState(toObject(hangerBracketOpts));

  const brakeBeamOpts = [
    "Straight",
    "Sagging",
    "Rested in pockets",
    "Improper Resting in pockets",
  ];
  const [brakeBeam, setBrakeBeam] = useState(toObject(brakeBeamOpts));

  const sideFrameKeysOpts = [
    "Present",
    "Not available",
    "Proper positioned from jaw bottom",
    "Improper positioned from jaw bottom",
  ];
  const [sideFrameKeys, setSideFrameKeys] = useState(toObject(sideFrameKeysOpts));

  const adapterRetainerOpts = ["Missing", "Available", "Tight", "Loose"];
  const [adapterRetainer, setAdapterRetainer] = useState(toObject(adapterRetainerOpts));

  /* Remarks */
  const [remarks, setRemarks] = useState("");

  /* Compile payload */
const payload = useMemo(
  () => ({
    inspectionType: "after-wheeling",
    date,
    bogieNo: bogieNo?.trim(),
    inspectorName: inspectorName?.trim(),

    sections: {
      adapterFitment: selectedFrom(adapterFitment),
      springCondition: selectedFrom(springCondition),
      springSeating: selectedFrom(springSeating),
      stopperCondition: selectedFrom(stopperCondition),
      adopterType,
      adopterVisual: selectedFrom(adopterVisual),
      emPad: selectedFrom(emPad),
      brakeBlock: selectedFrom(brakeBlock),
      wheelAdjustment: selectedFrom(wheelAdj),
      sideFramePocketLiners: selectedFrom(sideLiners),
      sideFrameCondition: selectedFrom(sideFrameCond),
      bogieBolster: selectedFrom(bolster),
      centerPivotType,
      sideBearersType: sideBearerType,
      sideBearers: selectedFrom(sideBearer),
      frictionWedges: selectedFrom(frictionWedge),
      springPlankCondition: selectedFrom(springPlank),
      hangerBrackets: selectedFrom(hangerBrackets),
      brakeBeam: selectedFrom(brakeBeam),
      sideFrameKeys: selectedFrom(sideFrameKeys),
      adapterRetainerBolts: selectedFrom(adapterRetainer),
    },

    remarks: remarks?.trim(),
  }),
  [
    date,
    bogieNo,
    inspectorName,
    adapterFitment,
    springCondition,
    springSeating,
    stopperCondition,
    adopterType,
    adopterVisual,
    emPad,
    brakeBlock,
    wheelAdj,
    sideLiners,
    sideFrameCond,
    bolster,
    centerPivotType,
    sideBearerType,
    sideBearer,
    frictionWedge,
    springPlank,
    hangerBrackets,
    brakeBeam,
    sideFrameKeys,
    adapterRetainer,
    remarks,
  ]
);


  /* Submit */
  const handleSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();

  // 🔹 Basic info
  formData.append("inspectionType", "after-wheeling");
  formData.append("date", date);
  formData.append("bogieNo", bogieNo);
  formData.append("inspectorName", inspectorName);

  if (inspectorSignature) {
    formData.append("inspectorSignature", inspectorSignature);
  }

  // 🔹 Sections (convert to JSON)
  formData.append("sections", JSON.stringify(payload.sections));

  // 🔹 Remarks
  formData.append("remarks", remarks);

  try {
    await api.post("/bogie-inspections/after-wheeling", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    alert("✅ After-Wheeling visual inspection saved successfully!");
  } catch (err) {
    console.error("❌ Upload failed:", err);
    alert("Upload failed — check console.");
  }
};

  const formDisabled = !bogieNo?.trim();

  return (
    <Box p={3} sx={{ background: "#eef2ff", minHeight: "100vh" }}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        INSPECTION AFTER WHEELING – Visual Inspection (Per Bogie)
      </Typography>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
  <Grid container spacing={2}>
    {/* Date */}
    <Grid item xs={12} sm={4}>
      <TextField
        label="Inspection Date"
        type="date"
        fullWidth
        value={date}
        onChange={(e) => setDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    </Grid>

    {/* Bogie No Dropdown */}
    <Grid item xs={12} sm={4}>
      <TextField
        select
        label="Bogie No."
        fullWidth
        value={bogieNo}
        onChange={(e) => setBogieNo(e.target.value)}
        helperText="Only bogies with 'Before Wheeling' inspection completed"
      >
        {bogieOptions.length > 0 ? (
          bogieOptions.map((b) => (
            <MenuItem key={b} value={b}>
              {b}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No eligible bogies</MenuItem>
        )}
      </TextField>
    </Grid>

    {/* Inspector Name */}
    <Grid item xs={12} sm={4}>
      <TextField
        label="Inspector Name"
        fullWidth
        value={inspectorName}
        onChange={(e) => setInspectorName(e.target.value)}
      />
    </Grid>

    {/* Inspector Signature Upload */}
    <Grid item xs={12} sm={6}>
      <Button variant="outlined" component="label" fullWidth>
        {inspectorSignature ? "Replace Inspector Signature" : "Upload Inspector Signature"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setInspectorSignature(e.target.files?.[0] || null)}
        />
      </Button>

      {inspectorSignature && (
        <Box sx={{ mt: 1 }}>
          <img
            src={URL.createObjectURL(inspectorSignature)}
            alt="signature"
            style={{
              width: "100%",
              maxHeight: 180,
              objectFit: "contain",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
        </Box>
      )}
    </Grid>
  </Grid>
</Paper>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2} sx={{ opacity: formDisabled ? 0.6 : 1, pointerEvents: formDisabled ? "none" : "auto" }}>
          <CheckGroup label="Adapter Fitment – Visual Check" options={adapterFitmentOpts} state={adapterFitment} setState={setAdapterFitment} />

          <CheckGroup label="Spring Condition" options={springConditionOpts} state={springCondition} setState={setSpringCondition} />

          <CheckGroup label="Spring Seating Condition" options={springSeatingOpts} state={springSeating} setState={setSpringSeating} />

          <CheckGroup label="Holding Stopper Condition – Spring Plank Stopper Arrangements" options={stopperConditionOpts} state={stopperCondition} setState={setStopperCondition} />

          {/* Adopter: Type + Visual */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    Type of Adopter
                  </Typography>
                  <FormControl>
                    <RadioGroup
                      row
                      value={adopterType}
                      onChange={(e) => setAdopterType(e.target.value)}
                    >
                      <FormControlLabel value="E" control={<Radio />} label="E" />
                      <FormControlLabel value="K" control={<Radio />} label="K" />
                      <FormControlLabel value="B" control={<Radio />} label="B" />
                    </RadioGroup>
                  </FormControl>
                </Box>
                <Divider flexItem orientation="vertical" />
                <Box sx={{ flex: 2 }}>
                  <CheckGroup
                    label="Adopter – Visual Condition"
                    options={adopterVisualOpts}
                    state={adopterVisual}
                    setState={setAdopterVisual}
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <CheckGroup label="EM Pad Condition" options={emPadOpts} state={emPad} setState={setEmPad} />

          <CheckGroup label="Brake Block – Visual" options={brakeBlockOpts} state={brakeBlock} setState={setBrakeBlock} />

          <CheckGroup label="Wheel Adjustment – Verified" options={wheelAdjOpts} state={wheelAdj} setState={setWheelAdj} />

          <CheckGroup label="Side Frame Pocket Liners – Visual & Dimensional" options={sideLinersOpts} state={sideLiners} setState={setSideLiners} />

          <CheckGroup label="Side Frame – Condition" options={sideFrameCondOpts} state={sideFrameCond} setState={setSideFrameCond} />

          <CheckGroup label="Bogie Bolster – Visual Condition" options={bolsterOpts} state={bolster} setState={setBolster} />

          {/* Center Pivot Type */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Center Pivot – Type
              </Typography>
              <FormControl>
                <RadioGroup
                  row
                  value={centerPivotType}
                  onChange={(e) => setCenterPivotType(e.target.value)}
                >
                  <FormControlLabel value="Spherical" control={<Radio />} label='“Spherical”' />
                  <FormControlLabel value="Flat" control={<Radio />} label='“Flat”' />
                </RadioGroup>
              </FormControl>
            </Paper>
          </Grid>

          {/* Side Bearers – Type + Condition */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    Side Bearers – Type
                  </Typography>
                  <FormControl>
                    <RadioGroup
                      value={sideBearerType}
                      onChange={(e) => setSideBearerType(e.target.value)}
                    >
                      <FormControlLabel
                        value='142.5 mm (+1.6 mm) for 3 rings'
                        control={<Radio />}
                        label='142.5 mm (+1.6 mm) – 3 rings'
                      />
                      <FormControlLabel
                        value='Metal-bonded rubber pad: 114.0 mm (+3.0 / -0.0 mm)'
                        control={<Radio />}
                        label='Metal-bonded rubber pad: 114.0 mm (+3.0 / -0.0)'
                      />
                    </RadioGroup>
                  </FormControl>
                </Box>
                <Divider flexItem orientation="vertical" />
                <Box sx={{ flex: 2 }}>
                  <CheckGroup
                    label="Side Bearers – Surface/Locking/Movement"
                    options={sideBearerOpts}
                    state={sideBearer}
                    setState={setSideBearer}
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <CheckGroup label="Friction Wedges" options={frictionWedgeOpts} state={frictionWedge} setState={setFrictionWedge} />

          <CheckGroup label="Spring Plank – Condition" options={springPlankOpts} state={springPlank} setState={setSpringPlank} />

          <CheckGroup label="Hanger Brackets" options={hangerBracketOpts} state={hangerBrackets} setState={setHangerBrackets} />

          <CheckGroup label="Brake Beam" options={brakeBeamOpts} state={brakeBeam} setState={setBrakeBeam} />

          <CheckGroup label="Side Frame Keys" options={sideFrameKeysOpts} state={sideFrameKeys} setState={setSideFrameKeys} />

          <CheckGroup label="Adapter Retainer Bolts" options={adapterRetainerOpts} state={adapterRetainer} setState={setAdapterRetainer} />

          {/* Remarks */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Chip label="Remarks" color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Add any notes or discrepancies observed.
                </Typography>
              </Stack>
              <TextField
                label="Remarks"
                multiline
                rows={4}
                fullWidth
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Paper>
          </Grid>
        </Grid>

        <Button
          variant="contained"
          color="success"
          type="submit"
          sx={{ mt: 3 }}
          disabled={formDisabled}
        >
          Save After-Wheeling Inspection
        </Button>
      </form>
    </Box>
  );
}
