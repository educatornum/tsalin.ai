const mongoose = require('mongoose');
const SalaryPost = require('../models/SalaryPost');
const Position = require('../models/Position');
const Major = require('../models/Major');
const { validationResult } = require('express-validator');

// @desc    Get all salary posts
// @route   GET /api/salary-posts
// @access  Public
exports.getSalaryPosts = async (req, res) => {
  try {
    const { 
      industry_id, 
      position_id, 
      level, 
      is_verified, 
      is_active,
      source,
      min_salary,
      max_salary,
      limit = 100,
      page = 1
    } = req.query;
    
    const filter = {};

    if (industry_id) filter.industry_id = industry_id;
    if (position_id) filter.position_id = position_id;
    if (level) filter.level = Number(level);
    if (is_verified !== undefined) filter.is_verified = is_verified === 'true';
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (source) {
      const allowed = new Set(['user_submission', 'cv_upload', 'lambda', 'third_party', 'other']);
      const requested = String(source)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => allowed.has(s));
      if (requested.length === 1) {
        filter.source = requested[0];
      } else if (requested.length > 1) {
        filter.source = { $in: requested };
      }
    }
    
    if (min_salary || max_salary) {
      filter.salary = {};
      if (min_salary) filter.salary.$gte = Number(min_salary);
      if (max_salary) filter.salary.$lte = Number(max_salary);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const salaryPosts = await SalaryPost.find(filter)
      .populate('industry_id', 'name_mn name_en average_salary')
      .populate('position_id', 'name_mn name_en')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await SalaryPost.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: salaryPosts.length,
      total: total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: salaryPosts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get single salary post
// @route   GET /api/salary-posts/:id
// @access  Public
exports.getSalaryPost = async (req, res) => {
  try {
    const salaryPost = await SalaryPost.findById(req.params.id)
      .populate('industry_id', 'name_mn name_en average_salary')
      .populate('position_id', 'name_mn name_en');

    if (!salaryPost) {
      return res.status(404).json({
        success: false,
        error: 'Salary post not found',
      });
    }

    res.status(200).json({
      success: true,
      data: salaryPost,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get salary statistics
// @route   GET /api/salary-posts/stats/:industry_id/:position_id
// @access  Public
exports.getSalaryStats = async (req, res) => {
  try {
    const { industry_id, position_id } = req.params;
    const indId = mongoose.Types.ObjectId.isValid(industry_id) ? new mongoose.Types.ObjectId(industry_id) : null;
    const posId = mongoose.Types.ObjectId.isValid(position_id) ? new mongoose.Types.ObjectId(position_id) : null;
    if (!indId || !posId) {
      return res.status(400).json({ success: false, message: 'Invalid industry_id or position_id' });
    }

    const stats = await SalaryPost.aggregate([
      {
        $match: {
          industry_id: indId,
          position_id: posId,
          is_active: true,
        },
      },
      {
        $group: {
          _id: null,
          avgSalary: { $avg: '$salary' },
          minSalary: { $min: '$salary' },
          maxSalary: { $max: '$salary' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Group by level
    const levelStats = await SalaryPost.aggregate([
      {
        $match: {
          industry_id: indId,
          position_id: posId,
          is_active: true,
        },
      },
      {
        $group: {
          _id: '$level',
          avgSalary: { $avg: '$salary' },
          minSalary: { $min: '$salary' },
          maxSalary: { $max: '$salary' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      overall: stats[0] || null,
      byLevel: levelStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Create new salary post
// @route   POST /api/salary-posts
// @access  Public
exports.createSalaryPost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const salaryPost = await SalaryPost.create(req.body);

    const populatedPost = await SalaryPost.findById(salaryPost._id)
      .populate('industry_id', 'name_mn name_en')
      .populate('position_id', 'name_mn name_en');

    res.status(201).json({
      success: true,
      data: populatedPost,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Update salary post
// @route   PUT /api/salary-posts/:id
// @access  Public
exports.updateSalaryPost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const salaryPost = await SalaryPost.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('industry_id', 'name_mn name_en')
      .populate('position_id', 'name_mn name_en');

    if (!salaryPost) {
      return res.status(404).json({
        success: false,
        error: 'Salary post not found',
      });
    }

    res.status(200).json({
      success: true,
      data: salaryPost,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Delete salary post
// @route   DELETE /api/salary-posts/:id
// @access  Public
exports.deleteSalaryPost = async (req, res) => {
  try {
    const salaryPost = await SalaryPost.findByIdAndDelete(req.params.id);

    if (!salaryPost) {
      return res.status(404).json({
        success: false,
        error: 'Salary post not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Salary post deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Bulk insert salary posts
// @route   POST /api/salary-posts/bulk
// @access  Public
exports.bulkInsertSalaryPosts = async (req, res) => {
  try {
    const salaryPosts = req.body.salaryPosts;

    if (!salaryPosts || !Array.isArray(salaryPosts)) {
      return res.status(400).json({
        success: false,
        error: 'SalaryPosts array is required',
      });
    }

    const result = await SalaryPost.insertMany(salaryPosts);

    res.status(201).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Filter salary posts by industry, position, optional level and experience
// @route   POST /api/salary-posts/filter
// @access  Public
exports.filterSalaryPosts = async (req, res) => {
  try {
    const { industry_id, position_id, level, experience_year } = req.body || {};

    if (!industry_id || !position_id) {
      return res.status(400).json({
        success: false,
        message: 'industry_id and position_id are required',
      });
    }

    const filter = {
      industry_id,
      position_id,
      is_active: true,
    };

    if (level !== undefined && level !== null && String(level).trim() !== '') {
      filter.level = Number(level);
    }
    if (experience_year !== undefined && experience_year !== null && String(experience_year).trim() !== '') {
      filter.experience_years = Number(experience_year);
    }

    const items = await SalaryPost.find(filter)
      .populate('industry_id', 'name_mn name_en average_salary')
      .populate('position_id', 'name_mn name_en')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server Error', message: error.message });
  }
};

// Helper: map experience years to level (1-10)
function yearsToLevel(years) {
  const y = Number(years) || 0;
  if (y <= 0) return 1;
  if (y === 1) return 2;
  if (y === 2) return 3;
  if (y === 3) return 4;
  if (y <= 5) return 5;
  if (y <= 7) return 6;
  if (y <= 9) return 7;
  if (y <= 11) return 8;
  if (y <= 14) return 9;
  return 10;
}

// @desc    Estimate salary stats for user by industry + position (+experience)
// @route   POST /api/salary-posts/estimate
// @access  Public
exports.estimateSalary = async (req, res) => {
  try {
    const { industry_id, position_id, experience_years } = req.body || {};
    if (!industry_id || !position_id) {
      return res.status(400).json({ success: false, message: 'industry_id and position_id are required' });
    }

    const indId = mongoose.Types.ObjectId.isValid(industry_id) ? new mongoose.Types.ObjectId(industry_id) : null;
    const posId = mongoose.Types.ObjectId.isValid(position_id) ? new mongoose.Types.ObjectId(position_id) : null;
    if (!indId || !posId) {
      return res.status(400).json({ success: false, message: 'Invalid industry_id or position_id' });
    }

    const baseMatch = {
      industry_id: indId,
      position_id: posId,
      is_active: true,
    };

    // Overall stats
    const overallAgg = await SalaryPost.aggregate([
      { $match: baseMatch },
      { $group: { _id: null, avgSalary: { $avg: '$salary' }, minSalary: { $min: '$salary' }, maxSalary: { $max: '$salary' }, count: { $sum: 1 } } },
    ]);

    // By level stats
    const byLevelAgg = await SalaryPost.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$level', avgSalary: { $avg: '$salary' }, minSalary: { $min: '$salary' }, maxSalary: { $max: '$salary' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    let forLevel = null;
    let computedLevel = null;
    if (experience_years !== undefined && experience_years !== null && String(experience_years).trim() !== '') {
      computedLevel = yearsToLevel(experience_years);
      const forLevelAgg = await SalaryPost.aggregate([
        { $match: { ...baseMatch, level: computedLevel } },
        { $group: { _id: null, avgSalary: { $avg: '$salary' }, minSalary: { $min: '$salary' }, maxSalary: { $max: '$salary' }, count: { $sum: 1 } } },
      ]);
      forLevel = forLevelAgg[0] || null;
    }

    return res.status(200).json({
      success: true,
      computedLevel,
      overall: overallAgg[0] || null,
      forLevel,
      byLevel: byLevelAgg,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server Error', message: error.message });
  }
};

// @desc    Get salary posts by industry and major
// @route   GET /api/salary-posts/by-major
// @access  Public
exports.getSalaryPostsByIndustryAndMajor = async (req, res) => {
  try {
    const { industry_id, major_id, limit = 100, page = 1 } = req.query;
    if (!industry_id || !major_id) {
      return res.status(400).json({ success: false, message: 'industry_id and major_id are required' });
    }

    const major = await Major.findById(major_id).lean();
    if (!major) {
      return res.status(404).json({ success: false, message: 'Major not found' });
    }

    const names = [];
    if (major.name_en) names.push(major.name_en);
    if (major.name_mn) names.push(major.name_mn);
    if (Array.isArray(major.synonyms)) names.push(...major.synonyms);

    const regexes = names
      .filter(Boolean)
      .map((n) => new RegExp(`^${String(n).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

    const positions = await Position.find({
      industry_id,
      is_active: true,
      $or: [
        { name_en: { $in: regexes } },
        { name_mn: { $in: regexes } },
      ],
    }).select({ _id: 1 }).lean();

    const positionIds = positions.map((p) => p._id);
    if (!positionIds.length) {
      return res.status(200).json({ success: true, count: 0, total: 0, page: Number(page), pages: 0, data: [] });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const filter = { industry_id, position_id: { $in: positionIds }, is_active: true };

    const [items, total] = await Promise.all([
      SalaryPost.find(filter)
        .populate('industry_id', 'name_mn name_en')
        .populate('position_id', 'name_mn name_en')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip),
      SalaryPost.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: items.length,
      total: total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: items,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server Error', message: error.message });
  }
};

