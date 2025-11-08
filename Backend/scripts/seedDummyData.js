// scripts/seedDummyData.js
const mongoose = require('mongoose');
const VitalSigns = require('../models/VitalSigns');
const User = require('../models/User');
require('dotenv').config();

// ========== CONFIGURATION ==========
const DAYS_TO_GENERATE = 90; // Generate 3 months of data
const READINGS_PER_DAY = 288; // Every 5 minutes = 288 readings/day

// ========== CONNECT TO DATABASE ==========
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// ========== GENERATE DUMMY VITALS ==========
const generateDummyVitals = (timestamp) => {
  // Add some realistic variation based on time of day
  const hour = timestamp.getHours();
  
  // Heart rate varies: lower during night, higher during day
  let heartRateBase = 70;
  if (hour >= 22 || hour <= 6) {
    heartRateBase = 60; // Night time - lower heart rate
  } else if (hour >= 10 && hour <= 20) {
    heartRateBase = 75; // Active hours
  }
  
  // Temperature slightly lower in morning
  let tempBase = 98.2;
  if (hour >= 4 && hour <= 8) {
    tempBase = 97.8;
  }
  
  return {
    heartRate: Math.floor(heartRateBase + (Math.random() * 20 - 10)),
    temperature: parseFloat((tempBase + (Math.random() * 1.0 - 0.5)).toFixed(1)),
    oxygenLevel: Math.floor(96 + Math.random() * 4),
    ecgRating: Math.floor(92 + Math.random() * 8),
    bloodPressure: {
      systolic: Math.floor(110 + Math.random() * 20),
      diastolic: Math.floor(70 + Math.random() * 15),
    },
    steps: Math.floor(Math.random() * 500),
    calories: Math.floor(Math.random() * 30),
  };
};

// ========== SEED DATA FOR USER ==========
const seedVitalsForUser = async (userId) => {
  console.log(`\n📊 Generating ${DAYS_TO_GENERATE} days of vitals data...`);
  
  const vitalsToInsert = [];
  const now = new Date();
  
  // Generate data for past X days
  for (let day = DAYS_TO_GENERATE; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // Generate readings every 5 minutes
    for (let reading = 0; reading < READINGS_PER_DAY; reading++) {
      const timestamp = new Date(date);
      timestamp.setHours(0, reading * 5, 0, 0); // Every 5 minutes
      
      const vitals = generateDummyVitals(timestamp);
      
      vitalsToInsert.push({
        userId: userId,
        heartRate: vitals.heartRate,
        temperature: vitals.temperature,
        oxygenLevel: vitals.oxygenLevel,
        ecgRating: vitals.ecgRating,
        bloodPressure: vitals.bloodPressure,
        steps: vitals.steps,
        calories: vitals.calories,
        timestamp: timestamp,
        date: timestamp.toISOString().split('T')[0],
        hour: timestamp.getHours(),
      });
    }
    
    // Progress indicator
    if ((DAYS_TO_GENERATE - day) % 10 === 0) {
      console.log(`   Generated ${DAYS_TO_GENERATE - day}/${DAYS_TO_GENERATE} days...`);
    }
  }
  
  console.log(`\n💾 Inserting ${vitalsToInsert.length} vital records into database...`);
  
  // Insert in batches for better performance
  const batchSize = 1000;
  for (let i = 0; i < vitalsToInsert.length; i += batchSize) {
    const batch = vitalsToInsert.slice(i, i + batchSize);
    await VitalSigns.insertMany(batch, { ordered: false });
    console.log(`   Inserted ${Math.min(i + batchSize, vitalsToInsert.length)}/${vitalsToInsert.length} records`);
  }
  
  console.log('✅ All vitals data inserted successfully!');
};

// ========== MAIN FUNCTION ==========
const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('\n🌱 Starting database seeding process...\n');
    
    // Get first active user
    const user = await User.findOne({ status: 'Active' });
    
    if (!user) {
      console.log('❌ No active users found. Please create a user first.');
      process.exit(1);
    }
    
    console.log(`👤 Found user: ${user.fullName || user.name} (${user.email})`);
    console.log(`📋 Patient ID: ${user.patientId}`);
    
    // Check if data already exists
    const existingData = await VitalSigns.countDocuments({ userId: user._id });
    
    if (existingData > 0) {
      console.log(`\n Found ${existingData} existing vital records for this user.`);
      console.log('Do you want to:');
      console.log('1. Delete existing data and create new (type: delete)');
      console.log('2. Keep existing data and add more (type: add)');
      console.log('3. Exit (type: exit)');
      console.log('\nFor now, we will DELETE existing data and create fresh data...');
      
      // Delete existing data
      await VitalSigns.deleteMany({ userId: user._id });
      console.log('✅ Existing data deleted');
    }
    
    // Seed new data
    await seedVitalsForUser(user._id);
    
    // Get statistics
    const stats = await VitalSigns.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalReadings: { $sum: 1 },
          avgHeartRate: { $avg: '$heartRate' },
          avgTemperature: { $avg: '$temperature' },
          avgOxygenLevel: { $avg: '$oxygenLevel' },
        },
      },
    ]);
    
    console.log('\n📈 Statistics:');
    console.log('─────────────────────────────────────');
    if (stats[0]) {
      console.log(`Total Readings: ${stats[0].totalReadings.toLocaleString()}`);
      console.log(`Avg Heart Rate: ${stats[0].avgHeartRate.toFixed(1)} bpm`);
      console.log(`Avg Temperature: ${stats[0].avgTemperature.toFixed(1)}°F`);
      console.log(`Avg Oxygen Level: ${stats[0].avgOxygenLevel.toFixed(1)}%`);
    }
    console.log('─────────────────────────────────────');
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n💡 You can now:');
    console.log('   1. View vitals in the app');
    console.log('   2. Generate health reports');
    console.log('   3. Download 24-hour or 3-month reports\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
};

// ========== SEED MULTIPLE USERS (OPTIONAL) ==========
const seedAllUsers = async () => {
  try {
    await connectDB();
    
    const users = await User.find({ status: 'Active' });
    console.log(`\n🌱 Seeding data for ${users.length} users...\n`);
    
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.fullName || user.name}`);
      await seedVitalsForUser(user._id);
    }
    
    console.log('\n🎉 All users seeded successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
};

//seedDatabase(); // Seed for first user
seedAllUsers(); // Seed for all users