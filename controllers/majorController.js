const Major = require('../models/Major');

// @desc    Get all majors
// @route   GET /api/majors
// @access  Public
exports.getMajors = async (req, res) => {
  try {
    const { is_active, industry_id } = req.query;
    const filter = {};

    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }
    if (industry_id) {
      filter.industry_id = industry_id;
    }

    const majors = await Major.find(filter)
      .populate('industry_id', 'name_mn name_en')
      .sort({ sort_order: 1, name_en: 1 });

    res.status(200).json({
      success: true,
      count: majors.length,
      data: majors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
    });
  }
};


