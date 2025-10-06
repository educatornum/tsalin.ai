const Industry = require('../models/Industry');
const Position = require('../models/Position');
const SalaryPost = require('../models/SalaryPost');

// GET /api/stats/positions-per-industry
exports.positionsPerIndustry = async (req, res) => {
  try {
    const result = await Position.aggregate([
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
      // Lookup salary_posts for this industry to compute position breakdown by actual usage
      {
        $lookup: {
          from: 'salary_posts',
          let: { indId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$industry_id', '$$indId'] }, { $eq: ['$is_active', true] } ] } } },
            { $group: { _id: '$position_id', cnt: { $sum: 1 } } },
            {
              $lookup: {
                from: 'positions',
                localField: '_id',
                foreignField: '_id',
                as: 'pos',
              },
            },
            { $unwind: '$pos' },
            { $sort: { cnt: -1 } },
            {
              $project: {
                _id: 0,
                k: { $ifNull: ['$pos.name_en', '$pos.name_mn'] },
                v: '$cnt',
              },
            },
          ],
          as: 'positionCounts',
        },
      },
      // Convert array of {k,v} to object { [name]: count }
      {
        $addFields: {
          positions: {
            $cond: [
              { $gt: [{ $size: '$positionCounts' }, 0] },
              { $arrayToObject: '$positionCounts' },
              {},
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          industry_id: '$industry._id',
          name_en: '$industry.name_en',
          name_mn: '$industry.name_mn',
          sort_order: '$industry.sort_order',
          count: 1,
          positions: 1,
        },
      },
      { $sort: { count: -1, sort_order: 1 } },
    ]);

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/stats/industries-with-zeros
exports.industriesWithZeroPositions = async (req, res) => {
  try {
    const result = await Industry.aggregate([
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

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// GET /api/stats/distinct-salary-positions-per-industry
exports.distinctSalaryPositionsPerIndustry = async (req, res) => {
  try {
    const result = await SalaryPost.aggregate([
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

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


