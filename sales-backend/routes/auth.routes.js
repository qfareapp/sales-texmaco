const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const SECRET_KEY = "texmaco_secret_key"; // change for production

const USERS = [
  {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "123456",
    role: "admin",
  },
  {
    username: process.env.SALES_USERNAME || "sales",
    password: process.env.SALES_PASSWORD || "123456",
    role: "sales",
  },
  {
    username: process.env.PRODUCTION_USERNAME || "production",
    password: process.env.PRODUCTION_PASSWORD || "123456",
    role: "production",
  },
  {
    username: process.env.MAINTENANCE_USERNAME || "maintenance",
    password: process.env.MAINTENANCE_PASSWORD || "123456",
    role: "maintenance",
  },
  {
    username: process.env.QUALITY_USERNAME || "quality",
    password: process.env.QUALITY_PASSWORD || "123456",
    role: "quality",
  },
  {
    username: process.env.GROUND_INSPECTOR_USERNAME || "inspector",
    password: process.env.GROUND_INSPECTOR_PASSWORD || "123456",
    role: "ground-inspector",
  },
];

// Login endpoint
router.post("/login", (req, res) => {
  console.log("Incoming login:", req.body);
  const { username, password } = req.body;

  const user = USERS.find(
    (entry) => entry.username === username && entry.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Generate token
  const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, {
    expiresIn: "8h",
  });

  res.json({
    success: true,
    message: "Login successful",
    token,
    role: user.role,
    username: user.username,
  });
});

module.exports = router;
