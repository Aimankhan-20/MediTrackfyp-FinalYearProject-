// routes/vitalsRoutes.js
const express = require("express");
const router = express.Router();
const VitalSigns = require("../models/VitalSigns");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "meditrack_super_secret_key_2024";

// ========== MIDDLEWARE ==========
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

// ========== GET LATEST VITALS ==========
router.get("/latest", authenticateToken, async (req, res) => {
  try {
    const vitals = await VitalSigns.getLatestVitals(req.userId);
    
    if (!vitals) {
      return res.status(404).json({ 
        message: "No vitals data found",
        data: null 
      });
    }

    res.status(200).json({
      message: "Latest vitals retrieved successfully",
      data: vitals,
    });
  } catch (error) {
    console.error("Get latest vitals error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ========== GET VITALS FOR DATE RANGE ==========
router.get("/range", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: "startDate and endDate are required" 
      });
    }

    const vitals = await VitalSigns.getVitalsForDateRange(
      req.userId,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      message: "Vitals retrieved successfully",
      count: vitals.length,
      data: vitals,
    });
  } catch (error) {
    console.error("Get vitals range error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ========== GET 24-HOUR VITALS ==========
router.get("/24hours", authenticateToken, async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    const vitals = await VitalSigns.find({
      userId: req.userId,
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ timestamp: 1 });

    // Calculate statistics
    const stats = await VitalSigns.getDailyStats(
      req.userId,
      endDate.toISOString().split('T')[0]
    );

    res.status(200).json({
      message: "24-hour vitals retrieved successfully",
      period: "24 hours",
      count: vitals.length,
      statistics: stats,
      data: vitals,
    });
  } catch (error) {
    console.error("Get 24h vitals error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ========== GET 3-MONTH VITALS ==========
router.get("/3months", authenticateToken, async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const vitals = await VitalSigns.find({
      userId: req.userId,
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ timestamp: 1 });

    // Get monthly statistics
    const monthlyStats = [];
    for (let i = 0; i < 3; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      
      const stats = await VitalSigns.getMonthlyStats(
        req.userId,
        month.getFullYear(),
        month.getMonth() + 1
      );
      
      if (stats) {
        monthlyStats.push({
          month: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          ...stats,
        });
      }
    }

    res.status(200).json({
      message: "3-month vitals retrieved successfully",
      period: "3 months",
      count: vitals.length,
      monthlyStatistics: monthlyStats.reverse(),
      data: vitals,
    });
  } catch (error) {
    console.error("Get 3-month vitals error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ========== GET HOURLY AVERAGE FOR TODAY ==========
router.get("/hourly-average", authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const hourlyData = await VitalSigns.getHourlyAverage(req.userId, today);

    res.status(200).json({
      message: "Hourly average retrieved successfully",
      date: today,
      data: hourlyData,
    });
  } catch (error) {
    console.error("Get hourly average error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ========== GET DAILY STATISTICS ==========
router.get("/daily-stats", authenticateToken, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const stats = await VitalSigns.getDailyStats(req.userId, date);

    if (!stats) {
      return res.status(404).json({ 
        message: "No data found for this date",
        data: null 
      });
    }

    res.status(200).json({
      message: "Daily statistics retrieved successfully",
      date: date,
      data: stats,
    });
  } catch (error) {
    console.error("Get daily stats error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ========== GET ALERTS ==========
router.get("/alerts", authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const alerts = await VitalSigns.find({
      userId: req.userId,
      alertLevel: { $ne: 'normal' },
      timestamp: { $gte: startDate },
    })
    .sort({ timestamp: -1 })
    .limit(100);

    res.status(200).json({
      message: "Alerts retrieved successfully",
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ========== MANUAL SAVE VITALS (for testing) ==========
router.post("/save", authenticateToken, async (req, res) => {
  try {
    const { heartRate, temperature, oxygenLevel, ecgRating } = req.body;

    if (!heartRate || !temperature || !oxygenLevel) {
      return res.status(400).json({ 
        message: "heartRate, temperature, and oxygenLevel are required" 
      });
    }

    const vitalSigns = new VitalSigns({
      userId: req.userId,
      heartRate: heartRate,
      temperature: temperature,
      oxygenLevel: oxygenLevel,
      ecgRating: ecgRating || null,
      timestamp: new Date(),
    });

    await vitalSigns.save();

    res.status(201).json({
      message: "Vitals saved successfully",
      data: vitalSigns,
    });
  } catch (error) {
    console.error("Save vitals error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ========== GET HEALTH REPORT DATA ==========
router.get("/health-report", authenticateToken, async (req, res) => {
  try {
    const { period = '24hours' } = req.query; // '24hours' or '3months'
    
    let startDate, endDate = new Date();
    
    if (period === '24hours') {
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
    }

    // Get vitals data
    const vitals = await VitalSigns.find({
      userId: req.userId,
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ timestamp: 1 });

    // Get statistics
    let statistics;
    if (period === '24hours') {
      statistics = await VitalSigns.getDailyStats(
        req.userId,
        endDate.toISOString().split('T')[0]
      );
    } else {
      // Get 3-month aggregate statistics
      const stats = await VitalSigns.aggregate([
        {
          $match: {
            userId: req.userId,
            timestamp: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: null,
            avgHeartRate: { $avg: '$heartRate' },
            avgTemperature: { $avg: '$temperature' },
            avgOxygenLevel: { $avg: '$oxygenLevel' },
            totalReadings: { $sum: 1 },
            normalReadings: {
              $sum: { $cond: [{ $eq: ['$isNormal', true] }, 1, 0] },
            },
            alerts: {
              $sum: { $cond: [{ $ne: ['$alertLevel', 'normal'] }, 1, 0] },
            },
          },
        },
      ]);
      
      statistics = stats[0] || null;
    }

    // Get user info
    const user = await User.findById(req.userId).select('-password');

    res.status(200).json({
      message: "Health report data retrieved successfully",
      period: period,
      user: {
        name: user.fullName || user.name,
        patientId: user.patientId,
        email: user.email,
      },
      statistics: statistics,
      vitalsCount: vitals.length,
      vitals: vitals,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Get health report error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

module.exports = router;