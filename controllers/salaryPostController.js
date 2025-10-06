const SalaryPost = require('../models/SalaryPost');
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

    const stats = await SalaryPost.aggregate([
      {
        $match: {
          industry_id: require('mongoose').Types.ObjectId(industry_id),
          position_id: require('mongoose').Types.ObjectId(position_id),
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
          industry_id: require('mongoose').Types.ObjectId(industry_id),
          position_id: require('mongoose').Types.ObjectId(position_id),
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

