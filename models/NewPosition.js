const mongoose = require('mongoose');

const newPositionSchema = new mongoose.Schema(
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
      default: 999,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      default: 'csv_inference',
    },
    raw_title: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'new_positions',
  }
);

newPositionSchema.index({ industry_id: 1, name_en: 1 }, { unique: true });

module.exports = mongoose.model('NewPosition', newPositionSchema);


