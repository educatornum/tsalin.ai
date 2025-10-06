const mongoose = require('mongoose');

const majorSchema = new mongoose.Schema(
  {
    industry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Industry',
      required: [true, 'Industry ID is required'],
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
    synonyms: {
      type: [String],
      default: [],
    },
    sort_order: {
      type: Number,
      default: 999,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      default: 'seed',
    },
  },
  {
    timestamps: true,
    collection: 'majors',
  }
);

majorSchema.index({ industry_id: 1, name_en: 1 }, { unique: true });
majorSchema.index({ industry_id: 1, sort_order: 1 });

module.exports = mongoose.model('Major', majorSchema);


