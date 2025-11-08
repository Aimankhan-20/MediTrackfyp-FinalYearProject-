// Excel/CSV to MongoDB - ONLY ABNORMAL STATUS PATIENTS
// Import with RECENT timestamps (last 2 months)
// Run: node convertCSV.js

const fs = require('fs');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

// ⭐⭐⭐ YOUR USER ID - CHANGE THIS ⭐⭐⭐
const YOUR_USER_ID = '690c4c93f611241fa1fc43f5';

// ⭐⭐⭐ SELECT YOUR FILE - CHANGE THIS ⭐⭐⭐
const SELECTED_FILE = './patient_mixed_health_data_26000.csv';
// Options:
//   './patient_all_abnormal_data_26000.csv'
//   './patient_mixed_health_data_26000.csv'
//   './patient_normal_health_data_26000.csv'

// MongoDB Connection
console.log('🔌 Connecting to MongoDB...\n');

mongoose.connect('mongodb://localhost:27017/MediTrack', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ MongoDB Connected Successfully\n');
    startConversion();
  })
  .catch(err => {
    console.error('❌ MongoDB Connection FAILED!');
    console.error('Error:', err.message);
    process.exit(1);
  });

// Import VitalSigns model
let VitalSigns;
try {
  VitalSigns = require('./models/VitalSigns');
  console.log('✅ VitalSigns model loaded\n');
} catch (error) {
  console.error('❌ Failed to load VitalSigns model!');
  console.error('Error:', error.message);
  process.exit(1);
}

// Function to find column
function findColumn(row, possibleNames) {
  for (let name of possibleNames) {
    if (row[name] !== undefined && row[name] !== '' && row[name] !== null) {
      return row[name];
    }
  }
  return null;
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
  return parseFloat(((celsius * 9/5) + 32).toFixed(1));
}

// ⭐ Generate recent timestamp (last 2 months)
function generateRecentTimestamp(index, totalRecords) {
  const now = new Date();
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(now.getMonth() - 2);
  
  // Distribute records evenly over 2 months
  const timeRange = now - twoMonthsAgo;
  const timeStep = timeRange / totalRecords;
  
  const timestamp = new Date(twoMonthsAgo.getTime() + (index * timeStep));
  return timestamp;
}

// Main function
async function convertFileToMongoDB(filePath) {
  console.log(`📂 Reading file: ${filePath}\n`);
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      console.error('❌ No data found in file!');
      mongoose.connection.close();
      return;
    }
    
    console.log(`📊 Found ${data.length} total rows in file`);
    console.log('📋 Columns:', Object.keys(data[0]).join(', '));
    console.log('');
    
    console.log('🔍 Loading ALL rows (Status filter temporarily disabled)...\n');
    
    // ⭐ TEMPORARY: Load ALL data to test
    const abnormalData = data;
    
    // Check what Status values exist
    const statusSample = data.slice(0, 5).map(row => {
      const status = findColumn(row, ['Status', 'status', 'STATUS']);
      return status;
    });
    console.log('📋 Status column samples:', statusSample);
    
    // Show sample RAW data from CSV
    console.log('\n📊 RAW CSV DATA SAMPLES (First 3 rows):');
    data.slice(0, 3).forEach((row, i) => {
      const hr = findColumn(row, ['Heart_Rate_bpm', 'Heart_Rate_BPM', 'Heart_Rate']);
      const tempC = findColumn(row, ['Body_Temperature_C', 'Temperature_C']);
      const spo2 = findColumn(row, ['SpO2_percent', 'SpO2_Percent', 'SpO2']);
      const status = findColumn(row, ['Status', 'status', 'STATUS']);
      
      console.log(`   Row ${i + 1}:`);
      console.log(`      HR: ${hr} bpm | Temp: ${tempC}°C (${celsiusToFahrenheit(tempC)}°F) | SpO2: ${spo2}% | Status: ${status}`);
    });
    console.log('');
    
    console.log(`✅ Loading ${abnormalData.length} rows (100.0%)\n`);
    
    const allRecords = [];
    let skippedCount = 0;
    
    console.log(`\n📋 Processing ${abnormalData.length} readings...\n`);
    console.log(`⏰ Timestamps will be distributed over LAST 2 MONTHS\n`);
    
    abnormalData.forEach((row, index) => {
      const heartRate = findColumn(row, [
        'Heart_Rate_bpm', 'Heart_Rate_BPM', 'Heart_Rate', 'HeartRate', 'heart_rate', 'HR', 'hr'
      ]);
      
      const tempC = findColumn(row, [
        'Body_Temperature_C', 'Temperature_C', 'temperature_c', 'Temp_C', 'temp_c',
        'Temperature', 'temp', 'Temp'
      ]);
      
      const spo2 = findColumn(row, [
        'SpO2_percent', 'SpO2_Percent', 'SpO2', 'spo2', 'SPO2', 'Oxygen', 'O2'
      ]);
      
      // ⭐ USE RECENT TIMESTAMP instead of old CSV timestamp
      const timestamp = generateRecentTimestamp(index, abnormalData.length);
      
      // Validation
      if (!heartRate || !tempC || !spo2) {
        skippedCount++;
        if (skippedCount <= 3) {
          console.log(`⚠️  Row ${index + 1}: Missing data`);
        }
        return;
      }

      const hr = parseInt(heartRate);
      const temp = parseFloat(tempC);
      const oxygen = parseInt(spo2);

      if (hr < 40 || hr > 200 || temp < 30 || temp > 45 || oxygen < 70 || oxygen > 100) {
        skippedCount++;
        return;
      }
      
      const tempF = celsiusToFahrenheit(temp);
      
      allRecords.push({
        userId: new mongoose.Types.ObjectId(YOUR_USER_ID),
        heartRate: hr,
        oxygenLevel: oxygen,
        temperature: tempF,
        ecgRating: null,
        bloodPressure: {
          systolic: null,
          diastolic: null
        },
        steps: 0,
        calories: 0,
        timestamp: timestamp,  // ⭐ Recent timestamp
        deviceId: 'CSV Import - Abnormal Data',
        location: 'N/A'
      });
    });
    
    if (skippedCount > 3) {
      console.log(`⚠️  ... and ${skippedCount - 3} more rows skipped\n`);
    }
    
    if (allRecords.length === 0) {
      console.error('\n❌ No valid records to import!');
      mongoose.connection.close();
      return;
    }
    
    console.log(`\n\n📊 SUMMARY:`);
    console.log(`   🆔 User ID: ${YOUR_USER_ID}`);
    console.log(`   ✅ Valid records to import: ${allRecords.length}`);
    console.log(`   ⚠️  Skipped (invalid): ${skippedCount}`);
    console.log(`   🚫 Normal records (excluded): ${data.length - abnormalData.length}`);
    console.log(`   📅 Date range: ${allRecords[0].timestamp.toLocaleDateString()} to ${allRecords[allRecords.length-1].timestamp.toLocaleDateString()}\n`);
    
    // Show sample
    console.log('📋 First record to insert:');
    console.log(JSON.stringify({
      ...allRecords[0],
      userId: allRecords[0].userId.toString(),
      timestamp: allRecords[0].timestamp.toISOString()
    }, null, 2));
    console.log('');
    
    console.log('📋 Last record to insert:');
    console.log(JSON.stringify({
      ...allRecords[allRecords.length-1],
      userId: allRecords[allRecords.length-1].userId.toString(),
      timestamp: allRecords[allRecords.length-1].timestamp.toISOString()
    }, null, 2));
    console.log('');
    
    // Delete old data first
    console.log('🗑️  Deleting old data for this user...');
    const deleteResult = await VitalSigns.deleteMany({ 
      userId: new mongoose.Types.ObjectId(YOUR_USER_ID) 
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} old records\n`);
    
    // Insert new data
    console.log('💾 Saving to MongoDB...\n');
    
    try {
      console.log('💾 Attempting to save with validation check...\n');
      
      // Test: Try saving first record only
      console.log('🧪 Testing single record insert first...');
      const testRecord = new VitalSigns(allRecords[0]);
      await testRecord.save();
      console.log('✅ Single record test passed!\n');
      
      // Now try bulk insert
      console.log('💾 Now attempting bulk insert...\n');
      const result = await VitalSigns.insertMany(allRecords, { 
        ordered: false,
        rawResult: true  // Get detailed results
      });
      
      console.log(`✅ SUCCESS! Saved ${result.insertedCount || result.length} records to MongoDB!\n`);
      
      // Double check - count records in DB
      const actualCount = await VitalSigns.countDocuments({ 
        userId: new mongoose.Types.ObjectId(YOUR_USER_ID) 
      });
      console.log(`🔍 Actual records in database: ${actualCount}\n`);
      
      const expectedCount = result.insertedCount || result.length;
      if (actualCount !== expectedCount) {
        console.log(`⚠️  WARNING: Expected ${expectedCount} but found ${actualCount} in database!\n`);
      }
      
      // Verify
      const sample = await VitalSigns.findOne({ 
        userId: new mongoose.Types.ObjectId(YOUR_USER_ID) 
      }).sort({ timestamp: -1 });
      
      if (sample) {
        console.log('✅ Data verified in database!');
        console.log('📝 Latest record:');
        console.log(`   Heart Rate: ${sample.heartRate} bpm`);
        console.log(`   SpO2: ${sample.oxygenLevel}%`);
        console.log(`   Temperature: ${sample.temperature}°F`);
        console.log(`   Alert Level: ${sample.alertLevel}`);
        console.log(`   Timestamp: ${sample.timestamp}\n`);
      }
      
      // Date range stats
      const dateStats = await VitalSigns.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(YOUR_USER_ID) } },
        { 
          $group: { 
            _id: null,
            minDate: { $min: '$timestamp' },
            maxDate: { $max: '$timestamp' },
            count: { $sum: 1 }
          } 
        }
      ]);
      
      if (dateStats.length > 0) {
        console.log('📅 Date Range:');
        console.log(`   Oldest: ${new Date(dateStats[0].minDate).toLocaleString()}`);
        console.log(`   Newest: ${new Date(dateStats[0].maxDate).toLocaleString()}`);
        console.log(`   Total: ${dateStats[0].count} records\n`);
      }
      
      // Alert stats
      const alertStats = await VitalSigns.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(YOUR_USER_ID) } },
        { $group: { _id: '$alertLevel', count: { $sum: 1 } } }
      ]);
      
      console.log('🚨 Alert Level Distribution:');
      alertStats.forEach(stat => {
        console.log(`   ${stat._id}: ${stat.count} records`);
      });
      
    } catch (error) {
      console.error('\n❌ INSERT ERROR!');
      console.error('Error:', error.message);
      console.error('Error name:', error.name);
      
      if (error.writeErrors) {
        console.error('\n📋 Write Errors (first 5):');
        error.writeErrors.slice(0, 5).forEach((err, i) => {
          console.error(`   ${i + 1}. ${err.errmsg}`);
        });
      }
      
      if (error.result) {
        console.error(`\n📊 Inserted: ${error.result.nInserted || 0} records`);
      }
    }
    
    mongoose.connection.close();
    console.log('\n🎉 Import process completed!\n');
    console.log('💡 Now your app should show data for the last 2 months!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR!');
    console.error('Error:', error.message);
    mongoose.connection.close();
  }
}

// Start conversion
function startConversion() {
  if (!fs.existsSync(SELECTED_FILE)) {
    console.error(`❌ ERROR: File not found: ${SELECTED_FILE}`);
    console.log('\n💡 Change SELECTED_FILE variable to one of these:');
    console.log('   - ./patient_all_abnormal_data_26000.csv');
    console.log('   - ./patient_mixed_health_data_26000.csv');
    console.log('   - ./patient_normal_health_data_26000.csv');
    mongoose.connection.close();
    process.exit(1);
  }

  console.log(`✅ Found file: ${SELECTED_FILE}\n`);
  console.log('🚀 Starting conversion...');
  console.log(`⚠️  MODE: Importing ABNORMAL STATUS with RECENT TIMESTAMPS`);
  console.log(`🆔 User ID: ${YOUR_USER_ID}\n`);
  console.log('─'.repeat(50) + '\n');
  
  convertFileToMongoDB(SELECTED_FILE);
}