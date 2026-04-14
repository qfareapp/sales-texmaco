import React, { useMemo, useState, useEffect } from "react";
import api from "../../api";
import "../../App.css";
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Divider,
  Chip,
  Stack,
} from "@mui/material";

/* ----------------------------------------------------------------
   Helpers
---------------------------------------------------------------- */
const todayISO = () => new Date().toISOString().slice(0, 10);

const within = (val, nominal, tol) => {
  if (val === "" || val === null || isNaN(Number(val))) return null;
  const n = Number(val);
  return n >= nominal - tol && n <= nominal + tol;
};

const triFromBool = (b) => (b === null ? 0 : b ? 1 : -1);

/* ----------------------------------------------------------------
   ✅ Tri-State Slider
---------------------------------------------------------------- */
const TriStateSlider = ({ value, onChange, disabled = false }) => {
  const marks = [
    { value: -1, label: "❌" },
    { value: 0, label: "—" },
    { value: 1, label: "✅" },
  ];

  const getColor = (val) =>
    val === 1 ? "success.main" : val === -1 ? "error.main" : "grey.500";

  return (
    <Box sx={{ width: 180, mx: "auto", textAlign: "center" }}>
      <Slider
        value={value}
        onChange={(e, newVal) => onChange(newVal)}
        step={1}
        min={-1}
        max={1}
        marks={marks}
        disabled={disabled}
        sx={{
          color: getColor(value),
          "& .MuiSlider-thumb": { bgcolor: getColor(value) },
          "& .MuiSlider-markLabel": {
            fontWeight: 600,
            color: "#444",
          },
        }}
      />
      <Typography
        variant="body2"
        sx={{
          mt: 0.5,
          fontWeight: 600,
          color: getColor(value),
        }}
      >
        {value === 1 ? "OK" : value === -1 ? "NOT OK" : "Pending"}
      </Typography>
    </Box>
  );
};

/* ----------------------------------------------------------------
   ✅ Visual Condition Checkbox Group
---------------------------------------------------------------- */
const VisualConditionGroup = ({ state, setState }) => {
  const options = ["Crack", "Scratch", "Dents", "Bend", "Damaged"];
  const handleChange = (opt) => (e) => {
    setState((prev) => ({ ...prev, [opt.toLowerCase()]: e.target.checked }));
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 2,
        mt: 1.5,
      }}
    >
      {options.map((opt) => (
        <FormControlLabel
          key={opt}
          control={
            <Checkbox
              checked={state[opt.toLowerCase()] || false}
              onChange={handleChange(opt)}
              sx={{ "& .MuiSvgIcon-root": { fontSize: 20 } }}
            />
          }
          label={opt}
          sx={{
            "& .MuiFormControlLabel-label": {
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#333",
            },
          }}
        />
      ))}
    </Box>
  );
};

/* ----------------------------------------------------------------
   ✅ Measurement Row (with integrated photo + visual)
---------------------------------------------------------------- */
const MeasurementRow = ({
  label,
  unit = "mm",
  refText,
  nominal,
  tolerance,
  measured,
  setMeasured,
  checkVal,
  setCheckVal,
  photo,
  setPhoto,
  auto,
  setAuto,
  visualState,
  setVisualState,
}) => {
  const autoCheck = useMemo(
    () => within(measured, nominal, tolerance),
    [measured, nominal, tolerance]
  );

  useEffect(() => {
    if (auto) setCheckVal(triFromBool(autoCheck));
  }, [autoCheck, auto]);

  const bgColor =
    checkVal === 1 ? "#e8f5e9" : checkVal === -1 ? "#ffebee" : "#f9fafb";

  return (
    <Grid item xs={12}>
      <Paper
        sx={{
          p: 3,
          background: bgColor,
          borderRadius: 3,
          boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography fontWeight={700} sx={{ fontSize: "1rem" }}>
              {label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reference: <b>{refText}</b>
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label={`Measured Value (${unit})`}
              type="number"
              fullWidth
              value={measured}
              onChange={(e) => setMeasured(e.target.value)}
              size="small"
            />
            <Typography variant="caption" color="text.secondary">
              {autoCheck === null
                ? "Enter a value"
                : autoCheck
                ? "Within tolerance"
                : "Out of tolerance"}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControlLabel
              control={<Switch checked={auto} onChange={(e) => setAuto(e.target.checked)} />}
              label="Auto"
            />
            <Typography variant="caption" color="text.secondary">
              {auto ? "Auto from measured value" : "Manual override enabled"}
            </Typography>
          </Grid>

          <Grid item xs={12} md={3}>
            <TriStateSlider value={checkVal} onChange={setCheckVal} disabled={auto} />
          </Grid>

          {/* Upload + Preview */}
          <Grid item xs={12}>
            <Button variant="outlined" component="label" fullWidth>
              {photo ? "Replace Photo" : "Upload Photo"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </Button>
            {photo && (
              <Box sx={{ mt: 1 }}>
                <img
                  src={URL.createObjectURL(photo)}
                  alt="preview"
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                  }}
                />
              </Box>
            )}
          </Grid>

          {/* Visual Checkboxes inside the same card */}
          {visualState && setVisualState && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1.5 }} />
              <VisualConditionGroup
                state={visualState}
                setState={setVisualState}
              />
            </Grid>
          )}
        </Grid>
      </Paper>
    </Grid>
  );
};

/* ----------------------------------------------------------------
   ✅ CheckPhotoRow (Go/No-Go + Slider + Photo + Visual)
---------------------------------------------------------------- */
const CheckPhotoRow = ({
  label,
  checkVal,
  setCheckVal,
  photo,
  setPhoto,
  visualState,
  setVisualState,
}) => {
  const bgColor =
    checkVal === 1 ? "#e8f5e9" : checkVal === -1 ? "#ffebee" : "#f9fafb";

  return (
    <Grid item xs={12}>
      <Paper
        sx={{
          p: 3,
          background: bgColor,
          borderRadius: 3,
          boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography fontWeight={700}>{label}</Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TriStateSlider value={checkVal} onChange={setCheckVal} />
          </Grid>

          <Grid item xs={12} md={4}>
            <Button variant="outlined" component="label" fullWidth>
              {photo ? "Replace Photo" : "Upload Photo"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </Button>
          </Grid>

          {photo && (
            <Grid item xs={12}>
              <img
                src={URL.createObjectURL(photo)}
                alt="preview"
                style={{
                  width: "100%",
                  maxHeight: 220,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
            </Grid>
          )}

          {visualState && setVisualState && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1.5 }} />
              <VisualConditionGroup
                state={visualState}
                setState={setVisualState}
              />
            </Grid>
          )}
        </Grid>
      </Paper>
    </Grid>
  );
};

/* ----------------------------------------------------------------
   Main Component
---------------------------------------------------------------- */
export default function BogieInspectionForm() {
  const [date, setDate] = useState(todayISO());
  const [wagonType, setWagonType] = useState("");
  const [bogieNo, setBogieNo] = useState("");
  const [bogieMake, setBogieMake] = useState("");
  const [bogieType, setBogieType] = useState("");
  const [bogieModel, setBogieModel] = useState("");

  /* =======================
     Numeric checks (+ auto)
     ======================= */
  // Wheel Base 2000 ± 5
  const [wbMeasured, setWbMeasured] = useState("");
  const [wbCheck, setWbCheck] = useState(0);
  const [wbPhoto, setWbPhoto] = useState(null);
  const [wbAuto, setWbAuto] = useState(true);
  const [wbVisual, setWbVisual] = useState({});

  // Bogie Diagonal 3018 ± 4.5
  const [bdMeasured, setBdMeasured] = useState("");
  const [bdCheck, setBdCheck] = useState(0);
  const [bdPhoto, setBdPhoto] = useState(null);
  const [bdAuto, setBdAuto] = useState(true);
  const [bdVisual, setBdVisual] = useState({});

  // Journal Centre 2260 ± 1.5
  const [jcMeasured, setJcMeasured] = useState("");
  const [jcCheck, setJcCheck] = useState(0);
  const [jcPhoto, setJcPhoto] = useState(null);
  const [jcAuto, setJcAuto] = useState(true);
  const [jcVisual, setJcVisual] = useState({});

  // Brake Beam Pocket Lateral Distance & APD 2048 ± 1.5
  const [bbMeasured, setBbMeasured] = useState("");
  const [bbCheck, setBbCheck] = useState(0);
  const [bbPhoto, setBbPhoto] = useState(null);
  const [bbAuto, setBbAuto] = useState(true);
  const [bbVisual, setBbVisual] = useState({});

  // Side Bearer Centre Distance – ref can be 1474 ±5 (default) or 1750 ±5
  const [sbRef, setSbRef] = useState({ nominal: 1474, tol: 5, text: "1474 ± 5 mm" });
  const [sbMeasured, setSbMeasured] = useState("");
  const [sbCheck, setSbCheck] = useState(0);
  const [sbPhoto, setSbPhoto] = useState(null);
  const [sbAuto, setSbAuto] = useState(true);
  const [sbVisual, setSbVisual] = useState({});

  /* =======================
     Go/No-Go / Visual checks
     ======================= */
  const [sfjCheck, setSfjCheck] = useState(0);
  const [sfjPhoto, setSfjPhoto] = useState(null);
  const [sfjVisual, setSfjVisual] = useState({});

  const [pushRodCheck, setPushRodCheck] = useState(0);
  const [pushRodPhoto, setPushRodPhoto] = useState(null);
  const [pushRodVisual, setPushRodVisual] = useState({});

  const [endPullRodCheck, setEndPullRodCheck] = useState(0);
  const [endPullRodPhoto, setEndPullRodPhoto] = useState(null);
  const [endPullRodVisual, setEndPullRodVisual] = useState({});

  const [brakeShoeType, setBrakeShoeType] = useState("");
  const [brakeShoeCheck, setBrakeShoeCheck] = useState(0);
  const [brakeShoePhoto, setBrakeShoePhoto] = useState(null);
  const [brakeShoeVisual, setBrakeShoeVisual] = useState({});

  /* =======================
     Adopter, Remarks, Signature
     ======================= */
  const [adopterType, setAdopterType] = useState("");
  const [otherRemark, setOtherRemark] = useState("");
  const [inspectorSignature, setInspectorSignature] = useState(null);

  // predefined remarks list (checkboxes)
  const remarkOptions = [
    "Side frame bottom jaw not as per drawing",
    "Pocket liner APD missing",
    "Brake beam pocket distance not as per gauge",
    "Bogie S/F punch missing one side",
    "Bogie journal centre out, not match as per gauge",
  ];
  const [remarkChecks, setRemarkChecks] = useState(
    remarkOptions.reduce((acc, r) => ({ ...acc, [r]: false }), {})
  );

  const compiledRemarks = useMemo(() => {
    const selected = remarkOptions
      .filter((r) => remarkChecks[r])
      .map((r, i) => `${i + 1}. ${r}`);
    if (otherRemark?.trim()) selected.push(`${selected.length + 1}. ${otherRemark.trim()}`);
    return selected.join("\n");
  }, [remarkChecks, otherRemark]);

  /* =======================
     Submit
     ======================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    // Header
    formData.append("date", date);
    formData.append("wagonType", wagonType);
    formData.append("bogieNo", bogieNo);
    formData.append("bogieMake", bogieMake);
    formData.append("bogieType", bogieType);
    formData.append("bogieModel", bogieModel);

    // Numeric + photos (field names align with your earlier backend)
    formData.append("wheelBaseCheck", wbCheck);
    formData.append("wheelBaseValue", wbMeasured);
    formData.append("wheelBaseVisual", JSON.stringify(wbVisual));
    if (wbPhoto) formData.append("wheelBasePhoto", wbPhoto);

    formData.append("bogieDiagonalCheck", bdCheck);
    formData.append("bogieDiagonalValue", bdMeasured);
    formData.append("bogieDiagonalVisual", JSON.stringify(bdVisual));
    if (bdPhoto) formData.append("bogieDiagonalPhoto", bdPhoto);

    formData.append("journalCentreCheck", jcCheck);
    formData.append("bogieJournalCentreValue", jcMeasured);
    formData.append("bogieJournalCentreVisual", JSON.stringify(jcVisual));
    if (jcPhoto) formData.append("bogieJournalCentrePhoto", jcPhoto);

    formData.append("brakeBeamPocket", bbMeasured); // matches previous schema's `value` string
    formData.append("brakeBeamPocketCheck", bbCheck); // optional new field for status
    formData.append("brakeBeamPocketVisual", JSON.stringify(bbVisual));
    if (bbPhoto) formData.append("brakeBeamPhoto", bbPhoto);

    formData.append("sideBearer", sbMeasured); // matches previous schema
    formData.append("sideBearerCheck", sbCheck); // optional status
    formData.append("sideBearerRef", sbRef.text);
    formData.append("sideBearerVisual", JSON.stringify(sbVisual));
    if (sbPhoto) formData.append("sideBearerPhoto", sbPhoto);

    // Go/No-Go & visual
    formData.append("sideFrameJawCheck", sfjCheck);
    formData.append("sideFrameJawVisual", JSON.stringify(sfjVisual));
    if (sfjPhoto) formData.append("sideFrameJawPhoto", sfjPhoto);

    formData.append("pushRodCheck", pushRodCheck);
    formData.append("pushRodVisual", JSON.stringify(pushRodVisual));
    if (pushRodPhoto) formData.append("pushRodPhoto", pushRodPhoto);

    formData.append("endPullRodCheck", endPullRodCheck);
    formData.append("endPullRodVisual", JSON.stringify(endPullRodVisual));
    if (endPullRodPhoto) formData.append("endPullRodPhoto", endPullRodPhoto);

    formData.append("brakeShoeType", brakeShoeType);
    formData.append("brakeShoeCheck", brakeShoeCheck);
    formData.append("brakeShoeVisual", JSON.stringify(brakeShoeVisual));
    if (brakeShoePhoto) formData.append("brakeShoePhoto", brakeShoePhoto);

    // Adopter, remarks, signature
    formData.append("adopterType", adopterType);
    formData.append("remarks", compiledRemarks);
    if (inspectorSignature) formData.append("inspectorSignature", inspectorSignature);

    try {
      await api.post("/bogie-inspections", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("✅ Inspection saved successfully!");
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed — check console");
    }
  };

  return (
    <Box p={3} sx={{ background: "#eef2ff", minHeight: "100vh" }}>
      <Typography variant="h5" fontWeight={700} mb={1}>
        INSPECTION BEFORE WHEELING – FCD - AW/SW
      </Typography>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
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
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Type of Wagon"
              value={wagonType}
              onChange={(e) => setWagonType(e.target.value)}
              fullWidth
              sx={{ minWidth: 160, "& .MuiInputLabel-root": { whiteSpace: "nowrap" } }}
            >
              <MenuItem value="BOXNS">BOXNS</MenuItem>
              <MenuItem value="BOXNHL">BOXNHL</MenuItem>
              <MenuItem value="BCNAHSM1">BCNAHSM1</MenuItem>
              <MenuItem value="BOBRNHSM2">BOBRNHSM2</MenuItem>
              <MenuItem value="BLCS">BLCS</MenuItem>
              <MenuItem value="BTAPM1">BTAPM1</MenuItem>
              <MenuItem value="BLSS">BLSS</MenuItem>
              <MenuItem value="FMP">FMP</MenuItem>
              <MenuItem value="CAMALCO">CAMALCO</MenuItem>
              <MenuItem value="BCBFG">BCBFG</MenuItem>
              <MenuItem value="BTCS">BTCS</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Bogie No." fullWidth value={bogieNo} onChange={(e) => setBogieNo(e.target.value)} />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Bogie Make"
              value={bogieMake}
              onChange={(e) => setBogieMake(e.target.value)}
              fullWidth
              sx={{
    minWidth: 150,
    '& .MuiInputLabel-root': { whiteSpace: 'normal' },  // allow wrapping
  }}
            >
              <MenuItem value="EMI">EMI</MenuItem>
              <MenuItem value="NF">NF</MenuItem>
              <MenuItem value="JEKAY">JEKAY</MenuItem>
              <MenuItem value="TEXMACO (URLA)">TEXMACO (URLA)</MenuItem>
              <MenuItem value="TEXMACO (SF)">TEXMACO (SF)</MenuItem>
              <MenuItem value="SK">SK</MenuItem>
              <MenuItem value="BAL">BAL</MenuItem>
              <MenuItem value="RV Casting">RV Casting</MenuItem>
              <MenuItem value="Brand Alloy">Brand Alloy</MenuItem>
              <MenuItem value="LCPL">LCPL</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select label="Bogie Type" value={bogieType} onChange={(e) => setBogieType(e.target.value)} fullWidth
              sx={{
    minWidth: 150,
    '& .MuiInputLabel-root': { whiteSpace: 'normal' },  // allow wrapping
  }}>
              <MenuItem value="CASNUB">CASNUB</MenuItem>
              <MenuItem value="LWLH">LWLH</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField select label="Bogie Model" value={bogieModel} onChange={(e) => setBogieModel(e.target.value)} fullWidth
              sx={{
    minWidth: 150,
    '& .MuiInputLabel-root': { whiteSpace: 'normal' },  // allow wrapping
  }}>
              <MenuItem value="22 HS">22 HS</MenuItem>
              <MenuItem value="NLB">NLB</MenuItem>
              <MenuItem value="25">25</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Side Bearer Ref."
              value={sbRef.text}
              onChange={(e) => {
                const v = e.target.value;
                if (v.includes("1474")) setSbRef({ nominal: 1474, tol: 5, text: "1474 ± 5 mm" });
                else setSbRef({ nominal: 1750, tol: 5, text: "1750 ± 5 mm" });
              }}
              fullWidth
              helperText="Choose correct reference for SB centre distance"
            >
              <MenuItem value="1474 ± 5 mm">1474 ± 5 mm</MenuItem>
              <MenuItem value="1750 ± 5 mm">1750 ± 5 mm (CAST Steel Bogie-LCCF 20)</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Form – order mirrors the sheet */}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {/* 1. Wheel Base */}
          <MeasurementRow
            label="Wheel Base"
            refText="2000 ± 5 mm"
            nominal={2000}
            tolerance={5}
            measured={wbMeasured}
            setMeasured={setWbMeasured}
            checkVal={wbCheck}
            setCheckVal={setWbCheck}
            photo={wbPhoto}
            setPhoto={setWbPhoto}
            auto={wbAuto}
            setAuto={setWbAuto}
            
          />

          {/* 2. Bogie Diagonal */}
          <MeasurementRow
            label="Bogie Diagonal"
            refText="3018 ± 4.5 mm"
            nominal={3018}
            tolerance={4.5}
            measured={bdMeasured}
            setMeasured={setBdMeasured}
            checkVal={bdCheck}
            setCheckVal={setBdCheck}
            photo={bdPhoto}
            setPhoto={setBdPhoto}
            auto={bdAuto}
            setAuto={setBdAuto}
            
          />

          {/* 3. Bogie Journal Centre */}
          <MeasurementRow
            label="Bogie Journal Centre"
            refText="2260 ± 1.5 mm"
            nominal={2260}
            tolerance={1.5}
            measured={jcMeasured}
            setMeasured={setJcMeasured}
            checkVal={jcCheck}
            setCheckVal={setJcCheck}
            photo={jcPhoto}
            setPhoto={setJcPhoto}
            auto={jcAuto}
            setAuto={setJcAuto}
            visualState={jcVisual}
            setVisualState={setJcVisual}
          />

          {/* 4. Side Frame Jaw (Go/No-Go Gauge) */}
          <CheckPhotoRow
  label="Side Frame Jaw (Go / No-Go Gauge)"
  checkVal={sfjCheck}
  setCheckVal={setSfjCheck}
  photo={sfjPhoto}
  setPhoto={setSfjPhoto}
  visualState={sfjVisual}        // ✅ pass visual state
  setVisualState={setSfjVisual}  // ✅ pass setter
/>


          {/* 5. Brake Beam Pocket – Lateral Distance & APD */}
          <MeasurementRow
            label="Brake Beam Pocket – Lateral Distance & APD"
            refText="2048 ± 1.5 mm"
            nominal={2048}
            tolerance={1.5}
            measured={bbMeasured}
            setMeasured={setBbMeasured}
            checkVal={bbCheck}
            setCheckVal={setBbCheck}
            photo={bbPhoto}
            setPhoto={setBbPhoto}
            auto={bbAuto}
            setAuto={setBbAuto}
             visualState={bbVisual}
            setVisualState={setBbVisual}
          />

          {/* 6. Side Bearer Centre Distance */}
          <MeasurementRow
            label="Side Bearer Centre Distance"
            refText={sbRef.text}
            nominal={sbRef.nominal}
            tolerance={sbRef.tol}
            measured={sbMeasured}
            setMeasured={setSbMeasured}
            checkVal={sbCheck}
            setCheckVal={setSbCheck}
            photo={sbPhoto}
            setPhoto={setSbPhoto}
            auto={sbAuto}
            setAuto={setSbAuto}
            visualState={sbVisual}
            setVisualState={setSbVisual}
          />

          {/* 7. Push Rod – Visual */}
          <CheckPhotoRow
  label="Push Rod"
  checkVal={pushRodCheck}
  setCheckVal={setPushRodCheck}
  photo={pushRodPhoto}
  setPhoto={setPushRodPhoto}
  visualState={pushRodVisual}        // ✅ added
  setVisualState={setPushRodVisual}  // ✅ added
/>

          {/* 8. End Pull Rod – Visual */}
          <CheckPhotoRow
  label="End Pull Rod"
  checkVal={endPullRodCheck}
  setCheckVal={setEndPullRodCheck}
  photo={endPullRodPhoto}
  setPhoto={setEndPullRodPhoto}
  visualState={endPullRodVisual}        // ✅ added
  setVisualState={setEndPullRodVisual}  // ✅ added
/>

          {/* 9. Brake Shoe Type + Visual */}
          
<Grid item xs={12}>
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} md={4}>
        <Typography fontWeight={700}>Brake Shoe</Typography>
        <TextField
          select
          label='Type ("L" / "K")'
          value={brakeShoeType}
          onChange={(e) => setBrakeShoeType(e.target.value)}
          fullWidth
          size="small"
          sx={{ mt: 1 }}
        >
          <MenuItem value="L">L</MenuItem>
          <MenuItem value="K">K</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12} md={4}>
        <TriStateSlider value={brakeShoeCheck} onChange={setBrakeShoeCheck} />
        <Typography variant="caption" color="text.secondary">
          Visual surface: OK / Cracks / Broken (map to slider)
        </Typography>
      </Grid>
      <Grid item xs={12} md={4}>
        <Button variant="outlined" component="label" fullWidth>
          {brakeShoePhoto ? "Replace Photo" : "Upload Photo"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setBrakeShoePhoto(e.target.files?.[0] || null)}
          />
        </Button>
      </Grid>
      {brakeShoePhoto && (
        <Grid item xs={12}>
          <img
            src={URL.createObjectURL(brakeShoePhoto)}
            alt="preview"
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "cover",
              borderRadius: 6,
            }}
          />
        </Grid>
      )}
      <Grid item xs={12}>
        <VisualConditionGroup state={brakeShoeVisual} setState={setBrakeShoeVisual} />   {/* ✅ added */}
      </Grid>
    </Grid>
  </Paper>
</Grid>

          {/* 10. Remarks + Adopter + Signature */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Chip label="Remarks" color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Tick all that apply. Add other remark if needed.
                </Typography>
              </Stack>

              <FormGroup>
                <Grid container spacing={1}>
                  {remarkOptions.map((opt) => (
                    <Grid item xs={12} sm={6} key={opt}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={remarkChecks[opt]}
                            onChange={(e) =>
                              setRemarkChecks((s) => ({ ...s, [opt]: e.target.checked }))
                            }
                          />
                        }
                        label={opt}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>

              <TextField
                label="Other Remark"
                multiline
                rows={3}
                fullWidth
                value={otherRemark}
                onChange={(e) => setOtherRemark(e.target.value)}
                sx={{ mt: 2 }}
              />

              <Divider sx={{ my: 3 }} />

              <Grid container spacing={2}>
               
                <Grid item xs={12} md={6}>
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
                        style={{ width: "100%", maxHeight: 180, objectFit: "contain" }}
                      />
                    </Box>
                  )}
                </Grid>
              </Grid>

              <TextField
                label="Compiled Remarks (auto)"
                value={compiledRemarks}
                fullWidth
                multiline
                rows={5}
                sx={{ mt: 3 }}
                InputProps={{ readOnly: true }}
                helperText="This is auto-generated from your checkboxes and other remark."
              />
            </Paper>
          </Grid>
        </Grid>

        <Button variant="contained" color="success" type="submit" sx={{ mt: 3 }}>
          Save Inspection
        </Button>
      </form>
    </Box>
  );
}
