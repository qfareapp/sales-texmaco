import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not saved yet";

export default function WagonDataSheetDraftForms() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "";
  const role = localStorage.getItem("role") || "";
  const [drafts, setDrafts] = useState([]);
  const [otherDrafts, setOtherDrafts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role !== "ground-inspector") return;
    Promise.all([
      api.get("/wagon-data-sheet/rows/second-zone/drafts", { params: { username } }),
      api.get("/wagon-data-sheet/drafts", { params: { username } }),
    ])
      .then(([ctrbResponse, otherResponse]) => {
        setDrafts(ctrbResponse.data?.data || []);
        setOtherDrafts(otherResponse.data?.data || []);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load draft forms."));
  }, [role, username]);

  if (role !== "ground-inspector") return <Box sx={{ p: 3 }}><Alert severity="info">Draft forms are available only for inspector accounts.</Alert></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800}>Draft Forms</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Continue any saved CTRB (Wheel Data) form and submit it when ready.</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {drafts.length + otherDrafts.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>No draft forms saved.</Paper>
      ) : (
        <Stack spacing={1.5}>
          <Typography fontWeight={800} color="#b45309">CTRB (Wheel Data) Drafts</Typography>
          {drafts.length === 0 && <Typography variant="body2" color="text.secondary">No CTRB drafts.</Typography>}
          {drafts.map((draft) => (
            <Paper key={draft._id} variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
              <Box>
                <Typography fontWeight={800}>{draft.secondZone?.draftWheelDataKey || "Untitled CTRB Draft"}</Typography>
                <Typography variant="body2" color="text.secondary">Wheel Dia: {draft.secondZone?.wheelDia || "-"} | Make: {draft.secondZone?.wheelOrigin || "-"}</Typography>
                <Typography variant="caption" color="text.secondary">Last saved: {formatDate(draft.secondZone?.draftSavedAt)}</Typography>
              </Box>
              <Button variant="contained" onClick={() => navigate(`/quality/wagon-data-sheet/first-zone?draftId=${draft._id}`)} sx={{ bgcolor: "#b45309", "&:hover": { bgcolor: "#92400e" }, textTransform: "none", fontWeight: 700 }}>Continue Draft</Button>
            </Paper>
          ))}
          {["dm-line", "dm-final"].map((formType) => {
            const isDmLine = formType === "dm-line";
            const items = otherDrafts.filter((draft) => draft.formType === formType);
            const title = isDmLine ? "DM Line Data Drafts" : "DM Final Data Drafts";
            const path = isDmLine ? "/quality/wagon-data-sheet/second-zone" : "/quality/wagon-data-sheet/final-details";
            return (
              <React.Fragment key={formType}>
                <Typography fontWeight={800} color={isDmLine ? "#15803d" : "#374151"} sx={{ mt: 1.5 }}>{title}</Typography>
                {items.length === 0 && <Typography variant="body2" color="text.secondary">No {title.toLowerCase()}.</Typography>}
                {items.map((draft) => (
                  <Paper key={draft._id} variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                    <Box>
                      <Typography fontWeight={800}>{draft.payload?.texNo || draft.payload?.dmNo || "Untitled Draft"}</Typography>
                      <Typography variant="body2" color="text.secondary">{draft.payload?.projectId ? "Project selected" : "Project not selected"}</Typography>
                      <Typography variant="caption" color="text.secondary">Last saved: {formatDate(draft.updatedAt)}</Typography>
                    </Box>
                    <Button variant="contained" onClick={() => navigate(`${path}?draftId=${draft._id}`)} sx={{ bgcolor: isDmLine ? "#15803d" : "#374151", textTransform: "none", fontWeight: 700 }}>Continue Draft</Button>
                  </Paper>
                ))}
              </React.Fragment>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
