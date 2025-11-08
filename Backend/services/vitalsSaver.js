// services/vitalsSaver.js
const VitalSigns = require('../models/VitalSigns');
const User = require('../models/User');

// ========== CONFIGURATION ==========
const SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// ========== AUTO-SAVE VITALS SERVICE ==========
class VitalsSaverService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  // Start the auto-save service
  start() {
    if (this.isRunning) {
      console.log('⚠️ Vitals saver service is already running');
      return;
    }

    console.log('🚀 Starting vitals auto-save service...');
    console.log(`📊 Vitals will be saved every ${SAVE_INTERVAL / 60000} minutes`);
    
    // Save immediately on start
    this.saveVitalsForAllUsers();
    
    // Then save every 5 minutes
    this.intervalId = setInterval(() => {
      this.saveVitalsForAllUsers();
    }, SAVE_INTERVAL);
    
    this.isRunning = true;
    console.log('✅ Vitals auto-save service started successfully');
  }

  // Stop the auto-save service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Vitals auto-save service stopped');
    }
  }

  // Save vitals for all active users
  async saveVitalsForAllUsers() {
    try {
      // Get all active users
      const users = await User.find({ status: 'Active' });
      
      if (users.length === 0) {
        console.log('ℹ️ No active users found');
        return;
      }

      console.log(`\n📈 Saving vitals for ${users.length} active user(s)...`);
      
      let savedCount = 0;
      let errorCount = 0;

      // Save vitals for each user
      for (const user of users) {
        try {
          await this.saveVitalsForUser(user._id);
          savedCount++;
        } catch (error) {
          console.error(`❌ Error saving vitals for user ${user._id}:`, error.message);
          errorCount++;
        }
      }

      const timestamp = new Date().toLocaleTimeString();
      console.log(`✅ [${timestamp}] Saved vitals: ${savedCount} success, ${errorCount} errors`);
      
    } catch (error) {
      console.error('❌ Error in saveVitalsForAllUsers:', error);
    }
  }

  // Save vitals for a specific user
  async saveVitalsForUser(userId) {
    // Generate realistic random vitals
    const vitals = VitalSigns.generateRandomVitals();
    
    // Create new vital signs entry
    const vitalSigns = new VitalSigns({
      userId: userId,
      heartRate: vitals.heartRate,
      temperature: vitals.temperature,
      oxygenLevel: vitals.oxygenLevel,
      ecgRating: vitals.ecgRating,
      bloodPressure: vitals.bloodPressure,
      steps: vitals.steps,
      calories: vitals.calories,
      timestamp: new Date(),
    });

    await vitalSigns.save();
    
    // Optional: Update user's alert count if abnormal
    if (vitalSigns.alertLevel !== 'normal') {
      await User.findByIdAndUpdate(userId, {
        $inc: { alerts: 1 }
      });
    }

    return vitalSigns;
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      saveInterval: `${SAVE_INTERVAL / 60000} minutes`,
      nextSave: this.isRunning 
        ? new Date(Date.now() + SAVE_INTERVAL).toLocaleTimeString()
        : 'Not scheduled',
    };
  }
}

// Create singleton instance
const vitalsSaverService = new VitalsSaverService();

module.exports = vitalsSaverService;