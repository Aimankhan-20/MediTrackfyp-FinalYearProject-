const mongoose = require("mongoose");

// Database mein verification codes store karne ke liye model
const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5, // Maximum 5 wrong attempts allowed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Code automatically delete hoga 10 minutes (600 seconds) baad
  },
});

// Index for faster queries
verificationCodeSchema.index({ email: 1, createdAt: 1 });

module.exports = mongoose.model("VerificationCode", verificationCodeSchema);