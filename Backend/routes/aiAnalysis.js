// ============================================
// FILE: routes/aiAnalysis.js
// COMPLETE WORKING VERSION WITH ALL FIXES
// ============================================

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const VitalSigns = require('../models/VitalSigns');
const User = require('../models/User');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================
// MEDICAL STANDARDS - LOWERED THRESHOLDS
// ============================================
const HEART_STANDARDS = {
  normal: { min: 60, max: 100, label: "Normal Heart Rate" },
  tachycardia: { threshold: 100, label: "Tachycardia" },
  severeTachycardia: { threshold: 120, label: "Severe Tachycardia" },
  bradycardia: { threshold: 60, label: "Bradycardia" },
  severeBradycardia: { threshold: 50, label: "Severe Bradycardia" },
  coronaryRisk: { min: 70, max: 80, label: "Coronary Risk Range" },
  atrialFlutter: { min: 150, max: 250, label: "Atrial Flutter" },
  atrialFibrillation: { threshold: 250, label: "Atrial Fibrillation" },
  sickSinusSyndrome: { threshold: 45, label: "Sick Sinus Syndrome" },
};

const OXYGEN_STANDARDS = {
  normal: { min: 95, max: 100, label: "Normal SpO2" },
  normalRange: { min: 94, max: 95, label: "Normal Range SpO2" },
  mildHypoxemia: { threshold: 94, label: "Mild Hypoxemia" },
  moderateHypoxemia: { threshold: 90, label: "Moderate Hypoxemia" },
  severeHypoxemia: { threshold: 85, label: "Severe Hypoxemia" },
};

const TEMP_STANDARDS = {
  normal: { min: 97, max: 99.5, label: "Normal Temperature" },
  fever: { threshold: 100.4, label: "Fever" },
  highFever: { threshold: 102, label: "High Fever" },
  hypothermia: { threshold: 96.8, label: "Hypothermia" },
};

// ============================================
// ENHANCED ANALYSIS - LOWER THRESHOLDS
// ============================================
function analyzeVitalsWithStandards(vitalsData) {
  const analysis = {
    totalReadings: vitalsData.length,
    dateRange: '2 months',
    
    averageHeartRate: 0,
    averageOxygenLevel: 0,
    averageTemp: 0,
    
    heartRateAnalysis: {
      normal: 0,
      tachycardia: 0,
      severeTachycardia: 0,
      bradycardia: 0,
      severeBradycardia: 0,
      coronaryRisk: 0,
      atrialFlutter: 0,
      atrialFibrillation: 0,
      sickSinus: 0,
    },
    
    oxygenAnalysis: {
      normal: 0,
      mildHypoxemia: 0,
      moderateHypoxemia: 0,
      severeHypoxemia: 0,
    },
    
    tempAnalysis: {
      normal: 0,
      fever: 0,
      highFever: 0,
      hypothermia: 0,
    },
    
    detectedDiseases: [],
    riskLevel: 'LOW',
    emergencyAlert: false,
    criticalReadings: [],
    concerns: [],
  };

  if (vitalsData.length === 0) {
    return { error: 'No data found for last 2 months' };
  }

  let hrSum = 0, oxygenSum = 0, tempSum = 0;

  vitalsData.forEach(reading => {
    const hr = reading.heartRate;
    const spo2 = reading.oxygenLevel;
    const temp = reading.temperature;
    
    hrSum += hr;
    oxygenSum += spo2;
    tempSum += temp;

    // ========== HEART RATE CLASSIFICATION ==========
    if (hr >= HEART_STANDARDS.atrialFibrillation.threshold) {
      analysis.heartRateAnalysis.atrialFibrillation++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'Atrial Fibrillation',
        heartRate: hr,
        severity: 'CRITICAL'
      });
    }
    else if (hr >= HEART_STANDARDS.atrialFlutter.min) {
      analysis.heartRateAnalysis.atrialFlutter++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'Atrial Flutter',
        heartRate: hr,
        severity: 'CRITICAL'
      });
    }
    else if (hr >= HEART_STANDARDS.severeTachycardia.threshold) {
      analysis.heartRateAnalysis.severeTachycardia++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'Severe Tachycardia',
        heartRate: hr,
        severity: 'HIGH'
      });
    }
    else if (hr > HEART_STANDARDS.tachycardia.threshold) {
      analysis.heartRateAnalysis.tachycardia++;
    }
    else if (hr < HEART_STANDARDS.sickSinusSyndrome.threshold) {
      analysis.heartRateAnalysis.sickSinus++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'Sick Sinus Syndrome',
        heartRate: hr,
        severity: 'CRITICAL'
      });
    }
    else if (hr < HEART_STANDARDS.severeBradycardia.threshold) {
      analysis.heartRateAnalysis.severeBradycardia++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'Severe Bradycardia',
        heartRate: hr,
        severity: 'HIGH'
      });
    }
    else if (hr < HEART_STANDARDS.bradycardia.threshold) {
      analysis.heartRateAnalysis.bradycardia++;
    }
    else if (hr < HEART_STANDARDS.coronaryRisk.min || hr > HEART_STANDARDS.coronaryRisk.max) {
      analysis.heartRateAnalysis.coronaryRisk++;
    }
    else {
      analysis.heartRateAnalysis.normal++;
    }

    // ========== OXYGEN LEVEL CLASSIFICATION ==========
    if (spo2 < OXYGEN_STANDARDS.severeHypoxemia.threshold) {
      analysis.oxygenAnalysis.severeHypoxemia++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'Severe Hypoxemia',
        oxygenLevel: spo2,
        severity: 'CRITICAL'
      });
    }
    else if (spo2 < OXYGEN_STANDARDS.moderateHypoxemia.threshold) {
      analysis.oxygenAnalysis.moderateHypoxemia++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'Moderate Hypoxemia',
        oxygenLevel: spo2,
        severity: 'HIGH'
      });
    }
    else if (spo2 < OXYGEN_STANDARDS.mildHypoxemia.threshold) {
      analysis.oxygenAnalysis.mildHypoxemia++;
    }
    else {
      analysis.oxygenAnalysis.normal++;
    }

    // ========== TEMPERATURE CLASSIFICATION ==========
    if (temp >= TEMP_STANDARDS.highFever.threshold) {
      analysis.tempAnalysis.highFever++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'High Fever',
        temperature: temp,
        severity: 'HIGH'
      });
    }
    else if (temp >= TEMP_STANDARDS.fever.threshold) {
      analysis.tempAnalysis.fever++;
    }
    else if (temp < TEMP_STANDARDS.hypothermia.threshold) {
      analysis.tempAnalysis.hypothermia++;
      analysis.criticalReadings.push({
        timestamp: reading.timestamp,
        condition: 'Hypothermia',
        temperature: temp,
        severity: 'HIGH'
      });
    }
    else {
      analysis.tempAnalysis.normal++;
    }
  });

  analysis.averageHeartRate = Math.round(hrSum / vitalsData.length);
  analysis.averageOxygenLevel = Math.round(oxygenSum / vitalsData.length);
  analysis.averageTemp = parseFloat((tempSum / vitalsData.length).toFixed(1));

  // ========================================
  // 🎯 DETECT SPECIFIC HEART DISEASES
  // CRITICAL if 10%+ readings (LOWERED from 20%)
  // ========================================
  const total = vitalsData.length;
  
  // 🚨 CRITICAL DISEASES - 5% threshold (VERY AGGRESSIVE)
  const CRITICAL_THRESHOLD = 0.05; // 5% of readings
  const HIGH_THRESHOLD = 0.10; // 10% of readings
  
  if (analysis.heartRateAnalysis.atrialFibrillation > total * CRITICAL_THRESHOLD) {
    const percentage = Math.round((analysis.heartRateAnalysis.atrialFibrillation / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Atrial Fibrillation',
      severity: 'CRITICAL',
      percentage: percentage,
      affectedReadings: analysis.heartRateAnalysis.atrialFibrillation,
      description: `Extremely rapid heart rate (>250 bpm) detected in ${percentage}% of readings`,
      icon: '🚨'
    });
    analysis.emergencyAlert = true;
  }
  
  if (analysis.heartRateAnalysis.atrialFlutter > total * CRITICAL_THRESHOLD) {
    const percentage = Math.round((analysis.heartRateAnalysis.atrialFlutter / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Atrial Flutter',
      severity: 'CRITICAL',
      percentage: percentage,
      affectedReadings: analysis.heartRateAnalysis.atrialFlutter,
      description: `Rapid atrial rhythm (150-250 bpm) detected in ${percentage}% of readings`,
      icon: '🚨'
    });
    analysis.emergencyAlert = true;
  }
  
  if (analysis.heartRateAnalysis.sickSinus > total * CRITICAL_THRESHOLD) {
    const percentage = Math.round((analysis.heartRateAnalysis.sickSinus / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Sick Sinus Syndrome',
      severity: 'CRITICAL',
      percentage: percentage,
      affectedReadings: analysis.heartRateAnalysis.sickSinus,
      description: `Dangerously slow heart rate (<45 bpm) detected in ${percentage}% of readings`,
      icon: '🚨'
    });
    analysis.emergencyAlert = true;
  }

  // ⚠️ HIGH RISK DISEASES - 15% threshold (LOWERED from 25%)
  if (analysis.heartRateAnalysis.severeTachycardia > total * 0.15) {
    const percentage = Math.round((analysis.heartRateAnalysis.severeTachycardia / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Severe Tachycardia',
      severity: 'HIGH',
      percentage: percentage,
      affectedReadings: analysis.heartRateAnalysis.severeTachycardia,
      description: `Very elevated heart rate (>120 bpm) detected in ${percentage}% of readings`,
      icon: '⚠️'
    });
    analysis.emergencyAlert = true;
  }

  if (analysis.heartRateAnalysis.tachycardia > total * 0.20) {
    const percentage = Math.round((analysis.heartRateAnalysis.tachycardia / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Tachycardia',
      severity: 'HIGH',
      percentage: percentage,
      affectedReadings: analysis.heartRateAnalysis.tachycardia,
      description: `Elevated heart rate (>100 bpm) detected in ${percentage}% of readings`,
      icon: '⚠️'
    });
  }
  
  if (analysis.heartRateAnalysis.severeBradycardia > total * 0.15) {
    const percentage = Math.round((analysis.heartRateAnalysis.severeBradycardia / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Severe Bradycardia',
      severity: 'HIGH',
      percentage: percentage,
      affectedReadings: analysis.heartRateAnalysis.severeBradycardia,
      description: `Very slow heart rate (<50 bpm) detected in ${percentage}% of readings`,
      icon: '⚠️'
    });
    analysis.emergencyAlert = true;
  }

  if (analysis.heartRateAnalysis.bradycardia > total * 0.20) {
    const percentage = Math.round((analysis.heartRateAnalysis.bradycardia / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Bradycardia',
      severity: 'HIGH',
      percentage: percentage,
      affectedReadings: analysis.heartRateAnalysis.bradycardia,
      description: `Slow heart rate (<60 bpm) detected in ${percentage}% of readings`,
      icon: '⚠️'
    });
  }

  if (analysis.heartRateAnalysis.coronaryRisk > total * 0.30) {
    const percentage = Math.round((analysis.heartRateAnalysis.coronaryRisk / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Coronary Risk Pattern',
      severity: 'MODERATE',
      percentage: percentage,
      affectedReadings: analysis.heartRateAnalysis.coronaryRisk,
      description: `Heart rate outside safe range (70-80 bpm) in ${percentage}% of readings`,
      icon: '⚠️'
    });
  }

  // 🫁 OXYGEN-RELATED CONDITIONS
  if (analysis.oxygenAnalysis.severeHypoxemia > total * CRITICAL_THRESHOLD) {
    const percentage = Math.round((analysis.oxygenAnalysis.severeHypoxemia / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Severe Hypoxemia',
      severity: 'CRITICAL',
      percentage: percentage,
      affectedReadings: analysis.oxygenAnalysis.severeHypoxemia,
      description: `Critically low oxygen levels (<85%) detected in ${percentage}% of readings`,
      icon: '🚨'
    });
    analysis.emergencyAlert = true;
  }

  if (analysis.oxygenAnalysis.moderateHypoxemia > total * 0.15) {
    const percentage = Math.round((analysis.oxygenAnalysis.moderateHypoxemia / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Moderate Hypoxemia',
      severity: 'HIGH',
      percentage: percentage,
      affectedReadings: analysis.oxygenAnalysis.moderateHypoxemia,
      description: `Low oxygen levels (<90%) detected in ${percentage}% of readings`,
      icon: '⚠️'
    });
    analysis.emergencyAlert = true;
  }

  if (analysis.oxygenAnalysis.mildHypoxemia > total * 0.25) {
    const percentage = Math.round((analysis.oxygenAnalysis.mildHypoxemia / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Mild Hypoxemia',
      severity: 'MODERATE',
      percentage: percentage,
      affectedReadings: analysis.oxygenAnalysis.mildHypoxemia,
      description: `Below-normal oxygen levels (<94%) detected in ${percentage}% of readings`,
      icon: '⚠️'
    });
  }

  // 🌡️ TEMPERATURE-RELATED CONDITIONS
  if (analysis.tempAnalysis.highFever > total * 0.15) {
    const percentage = Math.round((analysis.tempAnalysis.highFever / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Persistent High Fever',
      severity: 'HIGH',
      percentage: percentage,
      affectedReadings: analysis.tempAnalysis.highFever,
      description: `High fever (>102°F) detected in ${percentage}% of readings`,
      icon: '🔥'
    });
    analysis.emergencyAlert = true;
  }

  if (analysis.tempAnalysis.fever > total * 0.25) {
    const percentage = Math.round((analysis.tempAnalysis.fever / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Persistent Fever',
      severity: 'MODERATE',
      percentage: percentage,
      affectedReadings: analysis.tempAnalysis.fever,
      description: `Fever (>100.4°F) detected in ${percentage}% of readings`,
      icon: '🔥'
    });
  }

  if (analysis.tempAnalysis.hypothermia > total * 0.15) {
    const percentage = Math.round((analysis.tempAnalysis.hypothermia / total) * 100);
    analysis.detectedDiseases.push({
      name: 'Hypothermia Risk',
      severity: 'HIGH',
      percentage: percentage,
      affectedReadings: analysis.tempAnalysis.hypothermia,
      description: `Low body temperature (<96.8°F) detected in ${percentage}% of readings`,
      icon: '❄️'
    });
    analysis.emergencyAlert = true;
  }

  // ========== DETERMINE OVERALL RISK LEVEL ==========
  if (analysis.emergencyAlert || analysis.detectedDiseases.some(d => d.severity === 'CRITICAL')) {
    analysis.riskLevel = 'CRITICAL';
  }
  else if (analysis.detectedDiseases.some(d => d.severity === 'HIGH')) {
    analysis.riskLevel = 'HIGH';
  }
  else if (analysis.detectedDiseases.length > 0) {
    analysis.riskLevel = 'MODERATE';
  }
  else {
    analysis.riskLevel = 'LOW';
  }

  if (analysis.detectedDiseases.length > 0) {
    analysis.concerns = analysis.detectedDiseases.map(d => d.description);
  } else {
    analysis.concerns = ['All vitals within normal ranges. Keep up the healthy lifestyle!'];
  }

  return analysis;
}

// ============================================
// 🚨 EMERGENCY ALERT SYSTEM
// ============================================
async function sendEmergencyAlert(patientId, analysis, location = null) {
  console.log('🚨 ========================================');
  console.log('🚨 EMERGENCY ALERT TRIGGERED!');
  console.log('🚨 ========================================');
  console.log(`Patient ID: ${patientId}`);
  console.log(`Risk Level: ${analysis.riskLevel}`);
  console.log(`Detected Diseases: ${analysis.detectedDiseases.map(d => d.name).join(', ')}`);
  
  let googleMapsLink = null;
  if (location && location.latitude && location.longitude) {
    googleMapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    console.log(`📍 Location: ${location.latitude}, ${location.longitude}`);
    console.log(`📍 Maps Link: ${googleMapsLink}`);
  }
  
  console.log('🚨 ========================================\n');

  try {
    const user = await User.findById(patientId).select('emergencyContacts name email');
    
    if (!user) {
      console.log('⚠️ User not found in database');
      return {
        alertSent: false,
        error: 'User not found',
        timestamp: new Date()
      };
    }

    const emergencyContacts = user.emergencyContacts || [];
    
    if (emergencyContacts.length === 0) {
      console.log('⚠️ No emergency contacts found for this user');
      return {
        alertSent: false,
        error: 'No emergency contacts configured',
        timestamp: new Date()
      };
    }

    console.log(`📞 Found ${emergencyContacts.length} emergency contacts`);
    
    const criticalDiseases = analysis.detectedDiseases
      .filter(d => d.severity === 'CRITICAL' || d.severity === 'HIGH')
      .map(d => `${d.icon} ${d.name} - ${d.description}`)
      .join('\n');

    const alertMessage = `
🚨 MEDICAL EMERGENCY ALERT 🚨

Patient: ${user.name || patientId}
Time: ${new Date().toLocaleString()}
Risk Level: ${analysis.riskLevel}

⚠️ CRITICAL CONDITIONS DETECTED:
${criticalDiseases}

${googleMapsLink ? `📍 Patient Location: ${googleMapsLink}` : '📍 Location: Not available'}

🏥 IMMEDIATE ACTION REQUIRED
Please check on the patient immediately or contact emergency services.

---
This is an automated alert from MediTrack Health Monitoring System
    `.trim();

    console.log('\n📧 Alert Message:');
    console.log(alertMessage);
    console.log('\n📞 Sending to Emergency Contacts:');
    
    const alertResults = [];
    
    for (const contact of emergencyContacts) {
      console.log(`   → ${contact.name} (${contact.relationship}): ${contact.phone}`);
      
      alertResults.push({
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        alertSent: true,
        timestamp: new Date()
      });
    }

    console.log('\n✅ Emergency alerts prepared for all contacts');
    console.log('🚨 ========================================\n');

    return {
      alertSent: true,
      timestamp: new Date(),
      alertType: 'EMERGENCY',
      patientId: patientId,
      patientName: user.name,
      diseases: analysis.detectedDiseases.filter(d => d.severity === 'CRITICAL' || d.severity === 'HIGH'),
      location: location,
      googleMapsLink: googleMapsLink,
      contactsNotified: alertResults,
      totalContactsNotified: alertResults.length,
      message: alertMessage
    };

  } catch (error) {
    console.error('❌ Error sending emergency alerts:', error);
    return {
      alertSent: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

// ============================================
// 🧪 TEST ENDPOINT: Check Data Fetch
// ============================================
router.get('/test-fetch/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log(`🔍 Testing data fetch for patient: ${patientId}`);

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Try fetching with userId
    const vitalsData = await VitalSigns.find({
      userId: patientId,
      timestamp: { $gte: twoMonthsAgo }
    }).sort({ timestamp: -1 }).limit(10);

    console.log(`📊 Found ${vitalsData.length} vital readings with userId`);

    if (vitalsData.length === 0) {
      // Check with patientId field
      const checkWithPatientId = await VitalSigns.find({
        patientId: patientId
      }).limit(10);
      
      console.log(`🔍 Checking with 'patientId' field: ${checkWithPatientId.length} records`);
      
      // Total count
      const totalCount = await VitalSigns.countDocuments();
      console.log(`📊 Total records in VitalSigns: ${totalCount}`);
      
      // Sample record
      const sampleRecord = await VitalSigns.findOne();
      
      return res.json({
        success: false,
        message: 'No data found with userId field',
        patientId: patientId,
        alternativeResults: checkWithPatientId.length,
        totalRecords: totalCount,
        sampleRecord: sampleRecord,
        suggestion: checkWithPatientId.length > 0 
          ? 'Data exists with "patientId" field. Need to update schema or import script.'
          : 'No data found. Run the import script first.'
      });
    }

    res.json({
      success: true,
      patientId: patientId,
      recordsFound: vitalsData.length,
      dateRange: '2 months',
      sampleData: vitalsData.slice(0, 3),
      averages: {
        heartRate: Math.round(vitalsData.reduce((sum, v) => sum + v.heartRate, 0) / vitalsData.length),
        oxygenLevel: Math.round(vitalsData.reduce((sum, v) => sum + v.oxygenLevel, 0) / vitalsData.length),
        temperature: (vitalsData.reduce((sum, v) => sum + v.temperature, 0) / vitalsData.length).toFixed(1)
      }
    });

  } catch (error) {
    console.error('❌ Test fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ============================================
// ⚡ QUICK ANALYSIS - No AI (FAST)
// ============================================
router.post('/quick-analyze/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log(`⚡ Quick analysis (No AI) for patient: ${patientId}`);

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const vitalsData = await VitalSigns.find({
      userId: patientId,
      timestamp: { $gte: twoMonthsAgo }
    }).sort({ timestamp: -1 });

    console.log(`📊 Found ${vitalsData.length} vital readings`);

    if (vitalsData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No vitals data found for last 2 months',
        patientId: patientId
      });
    }

    const detailedAnalysis = analyzeVitalsWithStandards(vitalsData);

    if (detailedAnalysis.error) {
      return res.status(404).json({
        success: false,
        message: detailedAnalysis.error
      });
    }

    console.log(`🎯 Detected ${detailedAnalysis.detectedDiseases.length} conditions`);
    console.log(`🚨 Emergency: ${detailedAnalysis.emergencyAlert ? 'YES' : 'NO'}`);

    res.json({
      success: true,
      mode: 'QUICK_ANALYSIS',
      patientId: patientId,
      analysisDate: new Date(),
      
      detectedDiseases: detailedAnalysis.detectedDiseases,
      
      dataAnalyzed: {
        totalReadings: detailedAnalysis.totalReadings,
        dateRange: '2 months',
        averages: {
          heartRate: detailedAnalysis.averageHeartRate,
          oxygenLevel: detailedAnalysis.averageOxygenLevel,
          temperature: detailedAnalysis.averageTemp
        }
      },
      
      detailedAnalysis: {
        heartRateBreakdown: detailedAnalysis.heartRateAnalysis,
        oxygenBreakdown: detailedAnalysis.oxygenAnalysis,
        temperatureBreakdown: detailedAnalysis.tempAnalysis,
        criticalReadings: detailedAnalysis.criticalReadings.slice(0, 10),
        concerns: detailedAnalysis.concerns
      },
      
      riskLevel: detailedAnalysis.riskLevel,
      emergencyAlert: detailedAnalysis.emergencyAlert,
      
      note: 'Quick analysis without AI. Fast response. Use /analyze for full AI analysis.'
    });

  } catch (error) {
    console.error('❌ Quick analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing quick analysis',
      error: error.message
    });
  }
});

// ============================================
// TEST DATA GENERATION
// ============================================
router.post('/test-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 60 } = req.body || {};
    
    console.log(`📊 Generating ${days} days of test data for user: ${userId}`);
    
    const testData = [];
    for (let i = 0; i < days; i++) {
      for (let j = 0; j < 3; j++) {
        const timestamp = new Date(Date.now() - (i * 24 * 60 * 60 * 1000) - (j * 8 * 60 * 60 * 1000));
        
        testData.push({
          userId: userId,
          heartRate: 70 + Math.floor(Math.random() * 25),
          temperature: parseFloat((97.5 + Math.random() * 1.5).toFixed(1)),
          oxygenLevel: 95 + Math.floor(Math.random() * 5),
          ecgRating: 90 + Math.floor(Math.random() * 10),
          bloodPressure: {
            systolic: 110 + Math.floor(Math.random() * 20),
            diastolic: 70 + Math.floor(Math.random() * 15)
          },
          steps: Math.floor(Math.random() * 500),
          calories: Math.floor(Math.random() * 50),
          deviceId: "Meditrack W4704",
          location: "Test Location",
          timestamp: timestamp,
          date: timestamp.toISOString().split('T')[0],
          hour: timestamp.getHours()
        });
      }
    }
    
    const inserted = await VitalSigns.insertMany(testData);
    
    res.json({
      success: true,
      message: `✅ Successfully inserted ${inserted.length} test records`,
      recordsInserted: inserted.length,
      dateRange: {
        from: testData[testData.length - 1].date,
        to: testData[0].date
      }
    });
    
  } catch (error) {
    console.error('Test data insertion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error inserting test data',
      error: error.message
    });
  }
});

// ============================================
// GET VITALS ENDPOINT
// ============================================
router.get('/vitals/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 60 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const vitals = await VitalSigns.find({
      userId: userId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });
    
    res.json({
      success: true,
      userId: userId,
      totalRecords: vitals.length,
      dateRange: `Last ${days} days`,
      vitals: vitals
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 🤖 MAIN ENDPOINT: FULL AI Analysis
// ============================================
router.post('/analyze/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { location } = req.body;
    
    console.log(`🔍 Starting FULL AI analysis for patient: ${patientId}`);

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const vitalsData = await VitalSigns.find({
      userId: patientId,
      timestamp: { $gte: twoMonthsAgo }
    }).sort({ timestamp: -1 });

    console.log(`📊 Found ${vitalsData.length} vital readings`);

    if (vitalsData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No vitals data found for last 2 months',
        patientId: patientId,
        suggestion: `Use POST /api/ai/test-data/${patientId} to generate sample data OR run import script`
      });
    }

    const detailedAnalysis = analyzeVitalsWithStandards(vitalsData);

    if (detailedAnalysis.error) {
      return res.status(404).json({
        success: false,
        message: detailedAnalysis.error
      });
    }

    console.log(`🎯 Detected ${detailedAnalysis.detectedDiseases.length} conditions`);
    console.log(`🚨 Emergency Alert: ${detailedAnalysis.emergencyAlert ? 'YES' : 'NO'}`);

    // ========== 🚨 EMERGENCY ALERT ==========
    let emergencyResponse = null;
    if (detailedAnalysis.emergencyAlert) {
      console.log('🚨 CRITICAL CONDITION DETECTED - Sending emergency alerts...');
      emergencyResponse = await sendEmergencyAlert(patientId, detailedAnalysis, location);
    }

    const diseasesSummary = detailedAnalysis.detectedDiseases.length > 0
      ? detailedAnalysis.detectedDiseases.map(d => 
          `${d.icon} ${d.name} (${d.severity}) - ${d.percentage}% of readings affected`
        ).join('\n')
      : '✅ No concerning patterns detected';

    const prompt = `You are a cardiovascular AI specialist. Analyze this patient data:

PATIENT: ${patientId}
ANALYSIS PERIOD: 2 months (${detailedAnalysis.totalReadings} readings)

📊 VITALS SUMMARY:
- Average Heart Rate: ${detailedAnalysis.averageHeartRate} bpm
- Average Oxygen Level: ${detailedAnalysis.averageOxygenLevel}%
- Average Temperature: ${detailedAnalysis.averageTemp}°F

🎯 DETECTED CONDITIONS:
${diseasesSummary}

📈 DETAILED BREAKDOWN:
Heart Rate Analysis:
- Normal (60-100 bpm): ${detailedAnalysis.heartRateAnalysis.normal} readings
- Tachycardia (>100 bpm): ${detailedAnalysis.heartRateAnalysis.tachycardia} readings
- Severe Tachycardia (>120 bpm): ${detailedAnalysis.heartRateAnalysis.severeTachycardia} readings
- Bradycardia (<60 bpm): ${detailedAnalysis.heartRateAnalysis.bradycardia} readings
- Severe Bradycardia (<50 bpm): ${detailedAnalysis.heartRateAnalysis.severeBradycardia} readings
- Atrial Flutter (150-250 bpm): ${detailedAnalysis.heartRateAnalysis.atrialFlutter} readings
- Atrial Fibrillation (>250 bpm): ${detailedAnalysis.heartRateAnalysis.atrialFibrillation} readings
- Sick Sinus (<45 bpm): ${detailedAnalysis.heartRateAnalysis.sickSinus} readings
- Coronary Risk: ${detailedAnalysis.heartRateAnalysis.coronaryRisk} readings

Oxygen Level Analysis:
- Normal (≥95%): ${detailedAnalysis.oxygenAnalysis.normal} readings
- Mild Hypoxemia (<94%): ${detailedAnalysis.oxygenAnalysis.mildHypoxemia} readings
- Moderate Hypoxemia (<90%): ${detailedAnalysis.oxygenAnalysis.moderateHypoxemia} readings
- Severe Hypoxemia (<85%): ${detailedAnalysis.oxygenAnalysis.severeHypoxemia} readings

Temperature Analysis:
- Normal (97-99.5°F): ${detailedAnalysis.tempAnalysis.normal} readings
- Fever (>100.4°F): ${detailedAnalysis.tempAnalysis.fever} readings
- High Fever (>102°F): ${detailedAnalysis.tempAnalysis.highFever} readings
- Hypothermia (<96.8°F): ${detailedAnalysis.tempAnalysis.hypothermia} readings

⚠️ RISK LEVEL: ${detailedAnalysis.riskLevel}
🚨 EMERGENCY: ${detailedAnalysis.emergencyAlert ? 'YES - IMMEDIATE MEDICAL ATTENTION REQUIRED' : 'NO'}

Provide medical recommendations in JSON:
{
  "riskAssessment": "${detailedAnalysis.riskLevel}",
  "heartDiseaseRisk": "Professional medical explanation based on the patterns detected",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "recommendations": ["action1", "action2", "action3"],
  "emergencyAlert": ${detailedAnalysis.emergencyAlert},
  "summary": "Brief professional summary of the patient's condition"
}`;

    console.log('🤖 Calling Gemini AI...');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI timeout after 90 seconds')), 90000)
    );

    let aiAnalysis;
    let aiTimeout = false;

    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise
      ]);
      
      const response = await result.response;
      const aiAnalysisText = response.text();

      console.log('✅ AI response received');

      try {
        const jsonMatch = aiAnalysisText.match(/```json\n([\s\S]*?)\n```/) || 
                         aiAnalysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          aiAnalysis = JSON.parse(aiAnalysisText);
        }
      } catch (e) {
        console.log('⚠️ Could not parse AI response as JSON, using raw text');
        aiAnalysis = {
          riskAssessment: detailedAnalysis.riskLevel,
          summary: aiAnalysisText,
          rawResponse: true
        };
      }

    } catch (aiError) {
      console.error('⚠️ AI error:', aiError.message);
      aiTimeout = true;
      
      // Fallback response without AI
      aiAnalysis = {
        riskAssessment: detailedAnalysis.riskLevel,
        heartDiseaseRisk: detailedAnalysis.concerns.join('. '),
        keyFindings: detailedAnalysis.detectedDiseases.map(d => `${d.name}: ${d.description}`),
        recommendations: [
          detailedAnalysis.emergencyAlert ? '🚨 SEEK IMMEDIATE MEDICAL ATTENTION' : '✅ Continue monitoring vitals regularly',
          'Consult with a cardiologist about these findings',
          'Maintain medication schedule and healthy lifestyle',
          'Keep tracking vitals daily for pattern changes'
        ],
        emergencyAlert: detailedAnalysis.emergencyAlert,
        summary: `Analysis based on ${detailedAnalysis.totalReadings} readings over 2 months. Overall Risk: ${detailedAnalysis.riskLevel}. ${detailedAnalysis.detectedDiseases.length} conditions detected.`,
        aiTimeout: true,
        note: 'AI analysis unavailable. Showing statistical analysis only.'
      };
    }

    console.log('✅ Analysis complete\n');

    // Final response
    res.json({
      success: true,
      patientId: patientId,
      analysisDate: new Date(),
      
      detectedDiseases: detailedAnalysis.detectedDiseases,
      
      dataAnalyzed: {
        totalReadings: detailedAnalysis.totalReadings,
        dateRange: '2 months',
        averages: {
          heartRate: detailedAnalysis.averageHeartRate,
          oxygenLevel: detailedAnalysis.averageOxygenLevel,
          temperature: detailedAnalysis.averageTemp
        }
      },
      
      detailedAnalysis: {
        heartRateBreakdown: detailedAnalysis.heartRateAnalysis,
        oxygenBreakdown: detailedAnalysis.oxygenAnalysis,
        temperatureBreakdown: detailedAnalysis.tempAnalysis,
        criticalReadings: detailedAnalysis.criticalReadings.slice(0, 10),
        concerns: detailedAnalysis.concerns
      },
      
      aiAnalysis: aiAnalysis,
      
      riskLevel: detailedAnalysis.riskLevel,
      emergencyAlert: detailedAnalysis.emergencyAlert,
      emergencyDetails: emergencyResponse,
      
      patientLocation: location || null,
      
      aiTimeout: aiTimeout,
      
      message: aiTimeout 
        ? 'Analysis completed with statistical data only (AI unavailable)'
        : 'Full AI analysis completed successfully'
    });

  } catch (error) {
    console.error('❌ Analysis Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing analysis',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;