const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  {
    industry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Industry',
      required: [true, 'Industry ID is required'],
    },
    industry_sort_order: {
      type: Number,
      required: true,
    },
    industry_name_mn: {
      type: String,
      trim: true,
    },
    industry_name_en: {
      type: String,
      trim: true,
    },
    name_mn: {
      type: String,
      required: [true, 'Mongolian name is required'],
      trim: true,
    },
    name_en: {
      type: String,
      required: [true, 'English name is required'],
      trim: true,
    },
    sort_order: {
      type: Number,
      required: true,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'positions',
  }
);

// Indexes for better performance
positionSchema.index({ industry_id: 1, sort_order: 1 });
positionSchema.index({ industry_sort_order: 1 });
positionSchema.index({ is_active: 1 });

module.exports = mongoose.model('Position', positionSchema);

