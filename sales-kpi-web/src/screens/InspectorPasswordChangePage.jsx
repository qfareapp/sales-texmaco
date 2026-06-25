import React, { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import api from "../api";

export default function InspectorPasswordChangePage() {
  const username = localStorage.getItem("username") || "";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token") || "";
      await api.post(
        "/auth/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem("mustChangePassword", "false");
      window.location.href = "/quality-dashboard";
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", p: 2 }}>
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 460, p: 4, borderRadius: 4, border: "1.5px solid #e2e8f0" }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
          Change Temporary Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Logged in as <b>{username}</b>. Your temporary password must be changed before you can access the inspector portal.
        </Typography>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Temporary Password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              fullWidth
              required
            />
            <Button type="submit" variant="contained" disabled={saving} sx={{ py: 1.2, fontWeight: 800, textTransform: "none" }}>
              {saving ? "Updating..." : "Set New Password"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
