const mongoose = require("mongoose");

const lostWatchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  deviceId: {
    type: String,
    required: true,
    default: "Meditrack W4704",
  },
  lastKnownLocation: {
    type: String,
    default: "Unknown",
  },
  lastActive: {
    type: String,
    default: "Unknown",
  },
  reason: {
    type: String,
    default: "No reason provided",
  },
  status: {
    type: String,
    enum: ["reported", "found", "investigating"],
    default: "reported",
  },
  reportedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
lostWatchSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("LostWatch", lostWatchSchema);