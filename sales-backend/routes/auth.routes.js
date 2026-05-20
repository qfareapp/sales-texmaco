const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const SECRET_KEY = "texmaco_secret_key"; // change for production

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "123456";

// Login endpoint
router.post("/login", (req, res) => {
  console.log("Incoming login:", req.body);
  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Generate token
  const token = jwt.sign({ username: ADMIN_USERNAME, role: "admin" }, SECRET_KEY, {
    expiresIn: "8h",
  });

  res.json({
    success: true,
    message: "Login successful",
    token,
    role: "admin",
  });
});

module.exports = router;
