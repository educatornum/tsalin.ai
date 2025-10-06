require('dotenv').config();
const mongoose = require('mongoose');
const ProLevel = require('../models/ProLevel');
const proLevelsData = require('../seeds/proLevels.json');

const seedProLevels = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB Connected');

    // Delete existing pro levels
    await ProLevel.deleteMany({});
    console.log('Existing professional levels deleted');

    // Insert new pro levels
    const result = await ProLevel.insertMany(proLevelsData.proLevels);
    console.log(`${result.length} professional levels inserted successfully`);

    console.log('\nProfessional Levels:');
    result.forEach((level) => {
      console.log(`${level.level}. ${level.name_mn} - ${level.name_en}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding professional levels:', error);
    process.exit(1);
  }
};

seedProLevels();

