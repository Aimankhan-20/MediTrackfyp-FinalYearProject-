const express = require("express");
const router = express.Router();
const LostWatch = require("../models/LostWatch");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "meditrack_super_secret_key_2024";

// Middleware to authenticate token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// ===== REPORT LOST WATCH =====
router.post("/report", authenticateToken, async (req, res) => {
  try {
    const { deviceId, lastKnownLocation, lastActive, reason } = req.body;

    // Get user details
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create lost watch report
    const lostWatch = new LostWatch({
      userId: req.userId,
      userName: user.fullName || user.name,
      userEmail: user.email,
      deviceId: deviceId || "Meditrack W4704",
      lastKnownLocation: lastKnownLocation || "Unknown",
      lastActive: lastActive || "Unknown",
      reason: reason || "No reason provided",
      reportedAt: new Date(),
      status: "reported",
    });

    await lostWatch.save();

    // Update user status (optional)
    user.deviceStatus = "lost";
    await user.save();

    res.status(201).json({
      message: "Watch reported as lost successfully",
      report: lostWatch,
    });
  } catch (error) {
    console.error("Report lost watch error:", error);
    res.status(500).json({ 
      message: "Failed to report lost watch",
      error: error.message 
    });
  }
});

// ===== GET ALL LOST WATCH REPORTS (FOR ADMIN) =====
router.get("/all", authenticateToken, async (req, res) => {
  try {
    const reports = await LostWatch.find().sort({ reportedAt: -1 });
    
    res.status(200).json({
      message: "Lost watch reports retrieved successfully",
      count: reports.length,
      reports: reports,
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ 
      message: "Failed to get reports",
      error: error.message 
    });
  }
});

// ===== GET USER'S LOST WATCH REPORTS =====
router.get("/my-reports", authenticateToken, async (req, res) => {
  try {
    const reports = await LostWatch.find({ userId: req.userId }).sort({ reportedAt: -1 });
    
    res.status(200).json({
      message: "Your reports retrieved successfully",
      count: reports.length,
      reports: reports,
    });
  } catch (error) {
    console.error("Get user reports error:", error);
    res.status(500).json({ 
      message: "Failed to get your reports",
      error: error.message 
    });
  }
});

module.exports = router;