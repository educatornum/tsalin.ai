require('dotenv').config();
const mongoose = require('mongoose');
const SalaryPost = require('../models/SalaryPost');
const Industry = require('../models/Industry');
const Position = require('../models/Position');

const createSalaryPost = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB Connected\n');

    // Get first industry and position for example
    const industry = await Industry.findOne({ sort_order: 20 }); // IT
    const position = await Position.findOne({ 
      industry_id: industry._id 
    }).sort({ sort_order: 1 });

    console.log('Creating salary post for:');
    console.log(`Industry: ${industry.name_mn} (${industry.name_en})`);
    console.log(`Position: ${position.name_mn} (${position.name_en})`);
    console.log('');

    // Create sample salary posts
    const salaryPosts = [
      {
        industry_id: industry._id,
        position_id: position._id,
        source: 'user_submission',
        salary: 2800000, // 2.8M MNT
        level: 4, // Specialist
        experience_years: 3,
        is_verified: false,
        is_active: true,
      },
      {
        industry_id: industry._id,
        position_id: position._id,
        source: 'lambda',
        salary: 3500000, // 3.5M MNT
        level: 5, // Senior Specialist
        experience_years: 5,
        is_verified: true,
        is_active: true,
      },
      {
        industry_id: industry._id,
        position_id: position._id,
        source: 'third_party',
        salary: 2200000, // 2.2M MNT
        level: 2, // Employee
        experience_years: 1,
        is_verified: true,
        is_active: true,
      },
    ];

    const results = await SalaryPost.insertMany(salaryPosts);
    
    console.log(`✅ ${results.length} salary posts created successfully!\n`);

    results.forEach((post, index) => {
      console.log(`${index + 1}. Salary: ${post.salary.toLocaleString()}₮`);
      console.log(`   Level: ${post.level} | Experience: ${post.experience_years} years`);
      console.log(`   Source: ${post.source} | Verified: ${post.is_verified}`);
      console.log('');
    });

    // Get all salary posts for this position
    const allPosts = await SalaryPost.find({
      industry_id: industry._id,
      position_id: position._id,
    })
      .populate('industry_id', 'name_mn name_en')
      .populate('position_id', 'name_mn name_en');

    console.log(`\nTotal salary posts for this position: ${allPosts.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating salary post:', error);
    process.exit(1);
  }
};

createSalaryPost();

