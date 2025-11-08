const mongoose = require('mongoose');

const vitalSignsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  heartRate: {
    type: Number,
    required: true,
    min: 40,
    max: 200
  },
  oxygenLevel: {
    type: Number,
    required: true,
    min: 70,
    max: 100
  },
  temperature: {
    type: Number,
    required: true,
    min: 95,
    max: 106
  },
  ecgRating: {
    type: Number,
    default: null
  },
  bloodPressure: {
    systolic: {
      type: Number,
      default: null
    },
    diastolic: {
      type: Number,
      default: null
    }
  },
  steps: {
    type: Number,
    default: 0
  },
  calories: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  deviceId: {
    type: String,
    default: 'Unknown'
  },
  location: {
    type: String,
    default: 'N/A'
  },
  // Auto-calculated fields
  date: {
    type: String,
    default: function() {
      return new Date(this.timestamp).toISOString().split('T')[0];
    }
  },
  hour: {
    type: Number,
    default: function() {
      return new Date(this.timestamp).getHours();
    }
  },
  alertLevel: {
    type: String,
    enum: ['normal', 'warning', 'critical'],
    default: function() {
      // Critical conditions
      if (this.heartRate < 50 || this.heartRate > 120 ||
          this.oxygenLevel < 90 ||
          this.temperature < 97 || this.temperature > 100.4) {
        return 'critical';
      }
      // Warning conditions
      if (this.heartRate < 60 || this.heartRate > 100 ||
          this.oxygenLevel < 95 ||
          this.temperature < 97.5 || this.temperature > 99.5) {
        return 'warning';
      }
      return 'normal';
    }
  },
  isNormal: {
    type: Boolean,
    default: function() {
      return this.heartRate >= 60 && this.heartRate <= 100 &&
             this.oxygenLevel >= 95 &&
             this.temperature >= 97.5 && this.temperature <= 99.5;
    }
  }
}, {
  timestamps: true,
  collection: 'vitalsigns'
});

// Indexes for better query performance
vitalSignsSchema.index({ userId: 1, timestamp: -1 });
vitalSignsSchema.index({ alertLevel: 1 });
vitalSignsSchema.index({ date: 1, hour: 1 });

// Pre-save hook to auto-calculate fields
vitalSignsSchema.pre('save', function(next) {
  if (this.timestamp) {
    const date = new Date(this.timestamp);
    this.date = date.toISOString().split('T')[0];
    this.hour = date.getHours();
  }
  next();
});

// Pre-insertMany hook for bulk inserts
vitalSignsSchema.pre('insertMany', function(next, docs) {
  docs.forEach(doc => {
    if (doc.timestamp) {
      const date = new Date(doc.timestamp);
      doc.date = date.toISOString().split('T')[0];
      doc.hour = date.getHours();
      
      // Calculate alertLevel
      if (doc.heartRate < 50 || doc.heartRate > 120 ||
          doc.oxygenLevel < 90 ||
          doc.temperature < 97 || doc.temperature > 100.4) {
        doc.alertLevel = 'critical';
      } else if (doc.heartRate < 60 || doc.heartRate > 100 ||
                 doc.oxygenLevel < 95 ||
                 doc.temperature < 97.5 || doc.temperature > 99.5) {
        doc.alertLevel = 'warning';
      } else {
        doc.alertLevel = 'normal';
      }
      
      // Calculate isNormal
      doc.isNormal = doc.heartRate >= 60 && doc.heartRate <= 100 &&
                     doc.oxygenLevel >= 95 &&
                     doc.temperature >= 97.5 && doc.temperature <= 99.5;
    }
  });
  next();
});

const VitalSigns = mongoose.model('VitalSigns', vitalSignsSchema);

module.exports = VitalSigns;