const ProLevel = require('../models/ProLevel');
const { validationResult } = require('express-validator');

// @desc    Get all professional levels
// @route   GET /api/pro-levels
// @access  Public
exports.getProLevels = async (req, res) => {
  try {
    const { is_active } = req.query;
    const filter = {};

    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }

    const proLevels = await ProLevel.find(filter).sort({ sort_order: 1 });
    res.status(200).json({
      success: true,
      count: proLevels.length,
      data: proLevels,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get single professional level
// @route   GET /api/pro-levels/:id
// @access  Public
exports.getProLevel = async (req, res) => {
  try {
    const proLevel = await ProLevel.findById(req.params.id);

    if (!proLevel) {
      return res.status(404).json({
        success: false,
        error: 'Professional level not found',
      });
    }

    res.status(200).json({
      success: true,
      data: proLevel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get professional level by level number
// @route   GET /api/pro-levels/level/:level
// @access  Public
exports.getProLevelByNumber = async (req, res) => {
  try {
    const proLevel = await ProLevel.findOne({ level: req.params.level });

    if (!proLevel) {
      return res.status(404).json({
        success: false,
        error: 'Professional level not found',
      });
    }

    res.status(200).json({
      success: true,
      data: proLevel,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Bulk insert professional levels
// @route   POST /api/pro-levels/bulk
// @access  Public
exports.bulkInsertProLevels = async (req, res) => {
  try {
    const proLevels = req.body.proLevels;

    if (!proLevels || !Array.isArray(proLevels)) {
      return res.status(400).json({
        success: false,
        error: 'ProLevels array is required',
      });
    }

    // Delete existing pro levels if requested
    if (req.body.deleteExisting) {
      await ProLevel.deleteMany({});
    }

    const result = await ProLevel.insertMany(proLevels);

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

