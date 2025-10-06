require('dotenv').config();
const mongoose = require('mongoose');
const Industry = require('../models/Industry');
const industriesData = require('../seeds/industries.json');

const seedIndustries = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB Connected');

    // Delete existing industries
    await Industry.deleteMany({});
    console.log('Existing industries deleted');

    // Insert new industries
    const result = await Industry.insertMany(industriesData.industries);
    console.log(`${result.length} industries inserted successfully`);

    console.log('\nIndustries seeded:');
    result.forEach((industry, index) => {
      console.log(`${index + 1}. ${industry.name_mn} - ${industry.average_salary}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding industries:', error);
    process.exit(1);
  }
};

seedIndustries();

