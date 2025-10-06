require('dotenv').config();
const mongoose = require('mongoose');
const Industry = require('../models/Industry');
const Position = require('../models/Position');
const SalaryPost = require('../models/SalaryPost');

async function positionsPerIndustry() {
  return Position.aggregate([
    { $match: { is_active: true } },
    { $group: { _id: '$industry_id', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'industries',
        localField: '_id',
        foreignField: '_id',
        as: 'industry',
      },
    },
    { $unwind: '$industry' },
    {
      $project: {
        _id: 0,
        industry_id: '$industry._id',
        name_en: '$industry.name_en',
        name_mn: '$industry.name_mn',
        sort_order: '$industry.sort_order',
        count: 1,
      },
    },
    { $sort: { count: -1, sort_order: 1 } },
  ]);
}

async function industriesWithZeroPositions() {
  return Industry.aggregate([
    {
      $lookup: {
        from: 'positions',
        let: { indId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$industry_id', '$$indId'] }, is_active: true } },
          { $count: 'count' },
        ],
        as: 'pos',
      },
    },
    {
      $project: {
        _id: 0,
        industry_id: '$_id',
        name_en: 1,
        name_mn: 1,
        sort_order: 1,
        count: { $ifNull: [{ $first: '$pos.count' }, 0] },
      },
    },
    { $sort: { count: -1, sort_order: 1 } },
  ]);
}

async function distinctSalaryPositionsPerIndustry() {
  return SalaryPost.aggregate([
    { $match: { is_active: true } },
    { $group: { _id: { industry_id: '$industry_id', position_id: '$position_id' } } },
    { $group: { _id: '$_id.industry_id', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'industries',
        localField: '_id',
        foreignField: '_id',
        as: 'industry',
      },
    },
    { $unwind: '$industry' },
    {
      $project: {
        _id: 0,
        industry_id: '$industry._id',
        name_en: '$industry.name_en',
        name_mn: '$industry.name_mn',
        sort_order: '$industry.sort_order',
        count: 1,
      },
    },
    { $sort: { count: -1, sort_order: 1 } },
  ]);
}

async function main() {
  const which = process.argv[2] || 'positions-per-industry';
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  let result;
  if (which === 'positions-per-industry') result = await positionsPerIndustry();
  else if (which === 'industries-with-zeros') result = await industriesWithZeroPositions();
  else if (which === 'distinct-salary-positions-per-industry') result = await distinctSalaryPositionsPerIndustry();
  else {
    console.error('Unknown command. Use one of: positions-per-industry | industries-with-zeros | distinct-salary-positions-per-industry');
    process.exit(1);
  }

  console.table(result.map(r => ({
    industry_id: String(r.industry_id),
    name_en: r.name_en,
    count: r.count,
  })));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


