const mongoose = require('mongoose');

const proLevelSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      max: 10,
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
    collection: 'pro_levels',
  }
);

// Index for better performance
proLevelSchema.index({ level: 1 });
proLevelSchema.index({ sort_order: 1 });

module.exports = mongoose.model('ProLevel', proLevelSchema);

