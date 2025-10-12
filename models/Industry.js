const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema(
  {
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
    description: {
      type: String,
      trim: true,
    },
    average_salary: {
      type: String,
      required: [true, 'Average salary is required'],
      trim: true,
    },
    // Numeric salary fields (MNT), preferred for computations
    avg_salary_mnt: {
      average: { type: Number },
      junior: { type: Number },
      mid: { type: Number },
      senior: { type: Number },
    },
    avg_salary_min_mnt: { type: Number },
    avg_salary_max_mnt: { type: Number },
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
    collection: 'industries',
  }
);

// Index for better search performance
industrySchema.index({ sort_order: 1 });
industrySchema.index({ is_active: 1 });

module.exports = mongoose.model('Industry', industrySchema);

