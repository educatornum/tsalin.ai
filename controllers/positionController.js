const Position = require('../models/Position');
const { validationResult } = require('express-validator');

// @desc    Get all positions
// @route   GET /api/positions
// @access  Public
exports.getPositions = async (req, res) => {
  try {
    const { is_active, industry_id, industry_sort_order } = req.query;
    const filter = {};

    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }
    if (industry_id) {
      filter.industry_id = industry_id;
    }
    if (industry_sort_order) {
      filter.industry_sort_order = Number(industry_sort_order);
    }

    const positions = await Position.find(filter)
      .populate('industry_id', 'name_mn name_en')
      .sort({ industry_sort_order: 1, sort_order: 1 });

    res.status(200).json({
      success: true,
      count: positions.length,
      data: positions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get positions by industry
// @route   GET /api/positions/by-industry/:industry_id
// @access  Public
exports.getPositionsByIndustry = async (req, res) => {
  try {
    const positions = await Position.find({ 
      industry_id: req.params.industry_id,
      is_active: true 
    })
      .populate('industry_id', 'name_mn name_en')
      .sort({ sort_order: 1 });

    res.status(200).json({
      success: true,
      count: positions.length,
      data: positions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get positions without industry
// @route   GET /api/positions/without-industry
// @access  Public
exports.getPositionsWithoutIndustry = async (req, res) => {
  try {
    const positions = await Position.find({
      $or: [
        { industry_id: { $exists: false } },
        { industry_id: null },
      ],
    }).sort({ sort_order: 1 });

    res.status(200).json({
      success: true,
      count: positions.length,
      data: positions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get single position
// @route   GET /api/positions/:id
// @access  Public
exports.getPosition = async (req, res) => {
  try {
    const position = await Position.findById(req.params.id)
      .populate('industry_id', 'name_mn name_en average_salary');

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    res.status(200).json({
      success: true,
      data: position,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Create new position
// @route   POST /api/positions
// @access  Public
exports.createPosition = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const position = await Position.create(req.body);

    res.status(201).json({
      success: true,
      data: position,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Update position
// @route   PUT /api/positions/:id
// @access  Public
exports.updatePosition = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const position = await Position.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    res.status(200).json({
      success: true,
      data: position,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Delete position
// @route   DELETE /api/positions/:id
// @access  Public
exports.deletePosition = async (req, res) => {
  try {
    const position = await Position.findByIdAndDelete(req.params.id);

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Position deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Bulk insert positions
// @route   POST /api/positions/bulk
// @access  Public
exports.bulkInsertPositions = async (req, res) => {
  try {
    const positions = req.body.positions;

    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({
        success: false,
        error: 'Positions array is required',
      });
    }

    // Delete existing positions if requested
    if (req.body.deleteExisting) {
      await Position.deleteMany({});
    }

    const result = await Position.insertMany(positions);

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

