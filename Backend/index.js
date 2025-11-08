const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const os = require('os'); 
dotenv.config();

const app = express();

// ✅ MIDDLEWARE (Ye PEHLE hona chahiye routes se)
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "MediTrack Backend API is running...",
    status: "active",
    endpoints: {
      auth: "/api/auth",
      vitals: "/api/vitals",
      ai: "/api/ai",
      contact: "/api/contact",
      emergencyContacts: "/api/emergency-contacts",
      lostWatch: "/api/lost-watch"
    }
  });
});

// ✅ ROUTES (Middleware ke BAAD)
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
console.log("✅ Auth routes loaded");

const lostWatchRoutes = require("./routes/lostWatchRoutes");
app.use("/api/lost-watch", lostWatchRoutes);
console.log("✅ Lost watch routes loaded");

const contactRoutes = require("./routes/contactRoutes");
app.use("/api/contact", contactRoutes);
console.log("✅ Contact routes loaded");

// ⭐ NEW: Emergency Contact Routes
const emergencyContactRoutes = require("./routes/emergencyContactRoutes");
app.use("/api/emergency-contacts", emergencyContactRoutes);
console.log("✅ Emergency contact routes loaded");

const vitalsRoutes = require("./routes/vitalsRoutes");
app.use("/api/vitals", vitalsRoutes);
console.log("✅ Vitals routes loaded");

// ✅ AI Analysis Routes (IMPORTANT)
const aiAnalysisRoutes = require('./routes/aiAnalysis');
app.use('/api/ai', aiAnalysisRoutes);
console.log("✅ AI Analysis routes loaded at /api/ai");

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ 
    error: "Something went wrong!",
    message: err.message 
  });
});

// 404 handler (MUST be LAST)
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: "Route not found",
    requestedUrl: req.url,
    method: req.method
  });
});

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};  

const LOCAL_IP = getLocalIP(); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 ====================================`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📱 Network: http://${LOCAL_IP}:${PORT}`);
  console.log(`\n📍 API Endpoints:`);
  console.log(`   - Auth: http://${LOCAL_IP}:${PORT}/api/auth`);
  console.log(`   - Vitals: http://${LOCAL_IP}:${PORT}/api/vitals`);
  console.log(`   - AI Analysis: http://${LOCAL_IP}:${PORT}/api/ai/analyze/:patientId`);
  console.log(`   - Contact: http://${LOCAL_IP}:${PORT}/api/contact`);
  console.log(`   - Emergency Contacts: http://${LOCAL_IP}:${PORT}/api/emergency-contacts`);
  console.log(`   - Lost Watch: http://${LOCAL_IP}:${PORT}/api/lost-watch`);
  console.log(`🚀 ====================================\n`);
  console.log(`💡 Use this IP in your React Native app: ${LOCAL_IP}`);
  console.log(`💡 Make sure your device is on the same WiFi network\n`);
});