const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    // Ye batata hai ke ye contact KISKA hai (which user ka)
  },
  name: {
    type: String,
    required: true,
    trim: true,
    // Contact person ka naam (e.g., "Ali Ahmad")
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    // Contact ka phone number (e.g., "03001234567")
  },
  relationship: {
    type: String,
    required: true,
    trim: true,
    // Relation with user (e.g., "Father", "Brother", "Friend")
  },
  isPrimary: {
    type: Boolean,
    default: false,
    // Primary contact ko pehle notify kiya jaye (optional feature)
  },
}, { 
  timestamps: true 
  // Automatically createdAt aur updatedAt add karta hai
});

module.exports = mongoose.model("EmergencyContact", emergencyContactSchema);