import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import api from "../../api";

export default function WagonDataSheetRecordDialog({ target, onClose, onSaved }) {
  const [recordId, setRecordId] = useState(target.row.rowId);
  const [record, setRecord] = useState(null);
  const [choices, setChoices] = useState([]);
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const deleting = target.mode === "delete";
  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

  useEffect(() => {
    let current = true;
    setLoading(true);
    setRecord(null);
    setError("");
    api.get(`/wagon-data-sheet/admin/rows/${recordId}`, auth()).then(({ data }) => {
      if (!current) return;
      setRecord(data.data);
      setValues(data.data.values);
      if (recordId === target.row.rowId) {
        setChoices([{ rowId: recordId, label: `Selected entry: ${data.data.label}` }, ...data.data.linkedRecords.map((item) => ({ ...item, label: `Linked CTRB: ${item.label}` }))]);
      }
    }).catch((err) => {
      if (current) setError(err.response?.data?.message || "Failed to load record.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [recordId, target.row.rowId]);

  const changes = Object.fromEntries(Object.entries(values).filter(([path, value]) => value !== record?.values?.[path]));
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const url = `/wagon-data-sheet/admin/rows/${recordId}`;
      if (deleting) await api.delete(url, { ...auth(), data: { updatedAt: record.updatedAt } });
      else await api.patch(url, { changes, updatedAt: record.updatedAt }, auth());
      onSaved(deleting ? `Deleted ${record.label}.` : `Updated ${record.label}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the change. Please try again.");
    } finally { setSaving(false); }
  };
  const close = () => { if (!saving) onClose(); };

  return (
    <Dialog open onClose={close} fullWidth maxWidth={deleting ? "sm" : "md"}>
      <DialogTitle>{deleting ? "Delete wagon data" : "Edit wagon data"}</DialogTitle>
      <DialogContent dividers>
        <Typography fontWeight={700} sx={{ mb: 2 }}>{target.row.projectName} — {target.row.texNo !== "-" ? target.row.texNo : target.row.wheelDataLinks}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <Typography>Loading record…</Typography>}
        {!deleting && choices.length > 1 && (
          <TextField select fullWidth label="Entry to edit" value={recordId} disabled={saving || loading} sx={{ mb: 2 }} onChange={(event) => {
            if (Object.keys(changes).length && !window.confirm("Discard unsaved changes and switch entries?")) return;
            setRecordId(event.target.value);
          }}>
            {choices.map((item) => <MenuItem key={item.rowId} value={item.rowId}>{item.label}</MenuItem>)}
          </TextField>
        )}
        {record && (deleting ? (
          <Stack spacing={2}>
            <Typography>Delete <strong>{record.label}</strong> (SL: {record.values.slNo || "-"}, Wagon: {record.values.wagonNo || "-"})?</Typography>
            <Typography>Wheel Data Link: {record.values.wheelDataKey}</Typography>
            <Alert severity="warning">This permanently deletes this entry, including its saved forms and inspection history. Links to this entry will be removed. Other wagon and CTRB entries will be kept. This cannot be undone.</Alert>
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">Update the incorrect values, then save. Enter serial and heat numbers one per line in matching order. Axle and wheel serial/heat combinations must be unique; bearing serial numbers must be unique.</Typography>
            {[...new Set(record.fields.map((field) => field.section))].map((section) => (
              <Box key={section}>
                <Typography fontWeight={800} sx={{ mb: 1.5 }}>{section}</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  {record.fields.filter((field) => field.section === section).map((field) => (
                    <TextField key={field.path} label={field.label} value={values[field.path] || ""} disabled={saving} multiline={field.multiline} minRows={field.multiline ? 2 : undefined} size="small" fullWidth onChange={(event) => setValues((prev) => ({ ...prev, [field.path]: event.target.value }))} />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>Cancel</Button>
        <Button variant="contained" color={deleting ? "error" : "primary"} disabled={saving || loading || !record || (!deleting && !Object.keys(changes).length)} onClick={save}>
          {saving ? "Saving…" : deleting ? "Delete entry" : "Save changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
