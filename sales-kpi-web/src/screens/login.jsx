import React, { useState } from "react";
import axios from "axios";
import { API_ROOT } from "../config/apiBase";

export default function TexmacoAccessPortal() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setError("");
    try {
      const res = await axios.post(`${API_ROOT}/auth/login`, {
        username,
        password,
      });

      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("username", res.data.username || username);
        localStorage.setItem("mustChangePassword", res.data.mustChangePassword ? "true" : "false");

        if (res.data.mustChangePassword) {
          window.location.href = "/change-password";
          return;
        }

        if (res.data.role === "admin") window.location.href = "/";
        else if (res.data.role === "quality-admin") window.location.href = "/quality-dashboard";
        else if (res.data.role === "sales") window.location.href = "/";
        else if (res.data.role === "production") window.location.href = "/production";
        else if (res.data.role === "quality") window.location.href = "/quality-dashboard";
        else if (res.data.role === "ground-inspector") window.location.href = "/quality-dashboard";
        else if (res.data.role === "maintenance") window.location.href = "/maintenance/dashboard";
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Invalid username or password");
      setLoggingIn(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#f4f6f8",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px 50px",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          textAlign: "center",
          width: "350px",
        }}
      >
        <img
          src="/Texmaco logo.png"
          alt="Texmaco Logo"
          style={{ width: 100, marginBottom: 20 }}
        />
        <h2 style={{ marginBottom: 30, color: "#333" }}>
          Texmaco Module Access Portal
        </h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle} disabled={loggingIn}>
            {loggingIn ? "Logging in..." : "Login"}
          </button>
        </form>
        {error && <p style={{ color: "red", marginTop: 15 }}>{error}</p>}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: "15px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  fontSize: "14px",
};

const buttonStyle = {
  width: "100%",
  padding: "10px",
  backgroundColor: "#004aad",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "15px",
  cursor: "pointer",
};
