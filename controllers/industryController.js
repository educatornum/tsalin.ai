const Industry = require('../models/Industry');
const Position = require('../models/Position');
const { validationResult } = require('express-validator');
const Major = require('../models/Major');

// @desc    Get all industries
// @route   GET /api/industries
// @access  Public
exports.getIndustries = async (req, res) => {
  try {
    const { is_active } = req.query;
    const filter = {};

    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }

    const industries = await Industry.find(filter).sort({ sort_order: 1 });
    res.status(200).json({
      success: true,
      count: industries.length,
      data: industries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get single industry
// @route   GET /api/industries/:id
// @access  Public
exports.getIndustry = async (req, res) => {
  try {
    const industry = await Industry.findById(req.params.id);

    if (!industry) {
      return res.status(404).json({
        success: false,
        error: 'Industry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: industry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Create new industry
// @route   POST /api/industries
// @access  Public
exports.createIndustry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const industry = await Industry.create(req.body);

    res.status(201).json({
      success: true,
      data: industry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Update industry
// @route   PUT /api/industries/:id
// @access  Public
exports.updateIndustry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const industry = await Industry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!industry) {
      return res.status(404).json({
        success: false,
        error: 'Industry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: industry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Delete industry
// @route   DELETE /api/industries/:id
// @access  Public
exports.deleteIndustry = async (req, res) => {
  try {
    const industry = await Industry.findByIdAndDelete(req.params.id);

    if (!industry) {
      return res.status(404).json({
        success: false,
        error: 'Industry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Industry deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get positions by industry ID
// @route   GET /api/industries/:id/positions
// @access  Public
exports.getIndustryPositions = async (req, res) => {
  try {
    // Check if industry exists
    const industry = await Industry.findById(req.params.id);

    if (!industry) {
      return res.status(404).json({
        success: false,
        error: 'Industry not found',
      });
    }

    // Get all positions for this industry
    const positions = await Position.find({ 
      industry_id: req.params.id,
      is_active: true 
    }).sort({ sort_order: 1 });

    res.status(200).json({
      success: true,
      industry: {
        _id: industry._id,
        name_mn: industry.name_mn,
        name_en: industry.name_en,
        average_salary: industry.average_salary,
      },
      count: positions.length,
      positions: positions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};

// @desc    Get all industries with positions and majors (MN/EN)
// @route   GET /api/industry/positions
// @access  Public
exports.getIndustriesWithPositionsAndMajors = async (req, res) => {
  try {
    const result = await Industry.aggregate([
      { $match: { is_active: true } },
      { $sort: { sort_order: 1 } },
      {
        $lookup: {
          from: 'positions',
          let: { indId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$industry_id', '$$indId'] }, { $eq: ['$is_active', true] } ] } } },
            { $sort: { sort_order: 1 } },
            { $project: { _id: 1, name_en: 1, name_mn: 1, sort_order: 1 } },
          ],
          as: 'positions',
        },
      },
      {
        $lookup: {
          from: 'majors',
          let: { indId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$industry_id', '$$indId'] }, { $eq: ['$is_active', true] } ] } } },
            { $sort: { sort_order: 1 } },
            { $project: { _id: 1, name_en: 1, name_mn: 1, sort_order: 1 } },
          ],
          as: 'majors',
        },
      },
      {
        $project: {
          _id: 1,
          name_en: 1,
          name_mn: 1,
          sort_order: 1,
          positions: 1,
          majors: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, count: result.length, industries: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error', message: error.message });
  }
};

// @desc    Bulk insert industries
// @route   POST /api/industries/bulk
// @access  Public
exports.bulkInsertIndustries = async (req, res) => {
  try {
    const industries = req.body.industries;

    if (!industries || !Array.isArray(industries)) {
      return res.status(400).json({
        success: false,
        error: 'Industries array is required',
      });
    }

    // Delete existing industries if requested
    if (req.body.deleteExisting) {
      await Industry.deleteMany({});
    }

    const result = await Industry.insertMany(industries);

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

