const NewPosition = require('../models/NewPosition');
const Industry = require('../models/Industry');
const { validationResult } = require('express-validator');

exports.getNewPositions = async (req, res) => {
  try {
    const { industry_id, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (industry_id) filter.industry_id = industry_id;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      NewPosition.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      NewPosition.countDocuments(filter),
    ]);
    res.json({ success: true, total, items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getNewPosition = async (req, res) => {
  try {
    const item = await NewPosition.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.createNewPosition = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const item = await NewPosition.create(req.body);
    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.updateNewPosition = async (req, res) => {
  try {
    const item = await NewPosition.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.deleteNewPosition = async (req, res) => {
  try {
    const item = await NewPosition.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.promoteToPosition = async (req, res) => {
  try {
    // Move a new_position into positions collection (manual promote)
    const Position = require('../models/Position');
    const np = await NewPosition.findById(req.params.id);
    if (!np) return res.status(404).json({ success: false, message: 'Not found' });
    const exists = await Position.findOne({ industry_id: np.industry_id, name_en: np.name_en });
    if (exists) return res.status(409).json({ success: false, message: 'Position already exists' });
    const pos = await Position.create({
      industry_id: np.industry_id,
      industry_sort_order: np.industry_sort_order,
      name_mn: np.name_mn,
      name_en: np.name_en,
      sort_order: np.sort_order,
      is_active: true,
    });
    await np.deleteOne();
    res.json({ success: true, position: pos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


