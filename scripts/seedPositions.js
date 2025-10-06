require('dotenv').config();
const mongoose = require('mongoose');
const Position = require('../models/Position');
const Industry = require('../models/Industry');
const positionsData = require('../seeds/positions.json');

const seedPositions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB Connected');

    // Get all industries to map sort_order to _id
    const industries = await Industry.find().sort({ sort_order: 1 });
    
    if (industries.length === 0) {
      console.error('No industries found! Please run "npm run seed:industries" first.');
      process.exit(1);
    }

    console.log(`Found ${industries.length} industries`);

    // Create a map of industry sort_order to industry _id
    const industryMap = {};
    industries.forEach(industry => {
      industryMap[industry.sort_order] = industry._id;
    });

    // Delete existing positions
    await Position.deleteMany({});
    console.log('Existing positions deleted');

    // Transform positions data to include industry_id
    const positionsToInsert = positionsData.positions.map(pos => ({
      industry_id: industryMap[pos.branch_id],
      industry_sort_order: pos.branch_id,
      name_mn: pos.name_mn,
      name_en: pos.name_en,
      sort_order: pos.sort_order,
      is_active: true,
    }));

    // Insert new positions
    const result = await Position.insertMany(positionsToInsert);
    console.log(`${result.length} positions inserted successfully`);

    // Group by industry for display
    console.log('\nPositions by Industry:');
    const positionsByIndustry = {};
    result.forEach(position => {
      const sortOrder = position.industry_sort_order;
      if (!positionsByIndustry[sortOrder]) {
        positionsByIndustry[sortOrder] = [];
      }
      positionsByIndustry[sortOrder].push(position);
    });

    for (let i = 1; i <= 25; i++) {
      const industry = industries.find(ind => ind.sort_order === i);
      const positions = positionsByIndustry[i] || [];
      console.log(`\n${i}. ${industry.name_mn} (${positions.length} positions):`);
      positions.forEach(pos => {
        console.log(`   - ${pos.name_mn} (${pos.name_en})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding positions:', error);
    process.exit(1);
  }
};

seedPositions();

