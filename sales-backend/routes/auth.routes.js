const express = require("express");
const jwt = require("jsonwebtoken");
const InspectorAccount = require("../models/InspectorAccount");
const { hashPassword, verifyPassword } = require("../utils/passwords");
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
    username: process.env.QUALITY_ADMIN_USERNAME || "qualityadmin",
    password: process.env.QUALITY_ADMIN_PASSWORD || "123456",
    role: "quality-admin",
  },
  {
    username: process.env.GROUND_INSPECTOR_USERNAME || "inspector",
    password: process.env.GROUND_INSPECTOR_PASSWORD || "123456",
    role: "ground-inspector",
  },
  {
    username: process.env.WAGON_DATA_VIEWER_USERNAME || "wagonviewer",
    password: process.env.WAGON_DATA_VIEWER_PASSWORD || "123456",
    role: "wagon-data-viewer",
  },
];

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ success: false, message: "Authorization token required." });
  }

  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// Login endpoint
router.post("/login", async (req, res) => {
  console.log("Incoming login:", req.body);
  const { username, password } = req.body;

  const inspector = await InspectorAccount.findOne({
    username: String(username || "").trim().toLowerCase(),
    isActive: true,
  })
    .select("username passwordHash passwordSalt mustChangePassword")
    .lean();

  if (inspector && verifyPassword(password, inspector.passwordSalt, inspector.passwordHash)) {
    const token = jwt.sign({ username: inspector.username, role: "ground-inspector" }, SECRET_KEY, {
      expiresIn: "8h",
    });

    return res.json({
      success: true,
      message: "Login successful",
      token,
      role: "ground-inspector",
      username: inspector.username,
      mustChangePassword: Boolean(inspector.mustChangePassword),
    });
  }

  const user = USERS.find(
    (entry) => entry.username === username && entry.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, {
    expiresIn: "8h",
  });

  res.json({
    success: true,
    message: "Login successful",
    token,
    role: user.role,
    username: user.username,
    mustChangePassword: false,
  });
});

// Resolve the account from the verified token, never a client-supplied username.
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const username = String(req.user.username || "");
    const role = String(req.user.role || "");
    if (role === "ground-inspector") {
      const inspector = await InspectorAccount.findOne({ username: username.trim().toLowerCase() })
        .select("slNo name jobRole bay agency username isActive mustChangePassword createdAt updatedAt")
        .lean();
      if (inspector) {
        if (!inspector.isActive) return res.status(403).json({ success: false, message: "Inspector account is inactive." });
        return res.json({ success: true, data: {
          _id: String(inspector._id), slNo: inspector.slNo, name: inspector.name,
          username: inspector.username, role, jobRole: inspector.jobRole,
          bay: inspector.bay, agency: inspector.agency, isActive: inspector.isActive,
          mustChangePassword: Boolean(inspector.mustChangePassword),
          createdAt: inspector.createdAt || null, updatedAt: inspector.updatedAt || null,
        } });
      }
    }
    const account = USERS.find((user) => user.username === username && user.role === role);
    if (!account) return res.status(404).json({ success: false, message: "Account not found." });
    // Built-in accounts have no employee record; don't invent personal details.
    return res.json({ success: true, data: { username, role, isActive: true, mustChangePassword: false } });
  } catch (error) {
    console.error("Error loading account profile:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load your profile." });
  }
});

async function inspectorPhotoAccess(req, res, next) {
  try {
    if (req.user.role !== "ground-inspector") return res.status(403).json({ message: "Inspector login required." });
    const username = String(req.user.username || "").trim().toLowerCase();
    const account = await InspectorAccount.findOne({ username }).select("isActive").lean();
    if (account ? !account.isActive : !USERS.some((user) => user.username === username && user.role === "ground-inspector")) {
      return res.status(403).json({ message: "Inspector account unavailable." });
    }
    req.photoUsername = username;
    next();
  } catch { res.status(500).json({ message: "Unable to check inspector account." }); }
}

router.get("/me/photo", authMiddleware, inspectorPhotoAccess, async (req, res) => {
  try {
    const photo = await require("../models/InspectorPhoto").findOne({ username: req.photoUsername }).lean();
    res.json({ success: true, photo: photo?.photo || null });
  } catch { res.status(500).json({ message: "Unable to load profile photo." }); }
});

router.put("/me/photo", authMiddleware, inspectorPhotoAccess, async (req, res) => {
  const photo = req.body?.photo;
  if (!require("../utils/profilePhoto").validProfilePhoto(photo)) {
    return res.status(400).json({ message: "Choose a JPEG photo smaller than 100 KB." });
  }
  try {
    await require("../models/InspectorPhoto").findOneAndUpdate(
      { username: req.photoUsername }, { $set: { photo } }, { upsert: true, runValidators: true }
    );
    res.json({ success: true, photo });
  } catch { res.status(500).json({ message: "Unable to save profile photo. Please try again." }); }
});

router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const username = String(req.user?.username || "").trim().toLowerCase();
    const role = String(req.user?.role || "").trim();
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (role !== "ground-inspector") {
      return res.status(403).json({ success: false, message: "Only inspector accounts can change password here." });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    const inspector = await InspectorAccount.findOne({ username, isActive: true });
    if (!inspector) {
      return res.status(404).json({ success: false, message: "Inspector account not found." });
    }
    if (!verifyPassword(currentPassword, inspector.passwordSalt, inspector.passwordHash)) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    const { salt, hash } = hashPassword(newPassword);
    inspector.passwordSalt = salt;
    inspector.passwordHash = hash;
    inspector.mustChangePassword = false;
    await inspector.save();

    res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Error changing inspector password:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.authMiddleware = authMiddleware;

module.exports = router;
