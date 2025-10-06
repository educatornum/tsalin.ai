const mongoose = require('mongoose');
const ProLevel = require('./ProLevel');

const salaryPostSchema = new mongoose.Schema(
  {
    industry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Industry',
      required: [true, 'Industry ID is required'],
    },
    position_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Position',
      required: [true, 'Position ID is required'],
    },
    source: {
      type: String,
      enum: ['user_submission', 'cv_upload', 'lambda', 'third_party', 'other'],
      default: 'user_submission',
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      min: [0, 'Salary must be positive'],
    },
    level: {
      type: Number,
      required: [true, 'Professional level is required'],
      min: 1,
      max: 10,
    },
    level_name_mn: {
      type: String,
      trim: true,
    },
    level_name_en: {
      type: String,
      trim: true,
    },
    experience_years: {
      type: Number,
      required: [true, 'Experience years is required'],
      min: [0, 'Experience years cannot be negative'],
      max: [50, 'Experience years seems unrealistic'],
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'salary_posts',
  }
);

// Indexes for better query performance
salaryPostSchema.index({ industry_id: 1, position_id: 1 });
salaryPostSchema.index({ level: 1 });
salaryPostSchema.index({ is_verified: 1 });
salaryPostSchema.index({ salary: 1 });
salaryPostSchema.index({ createdAt: -1 });

// Helper to set level name fields from ProLevel
async function setLevelNamesForDoc(doc) {
  if (doc && typeof doc.level === 'number') {
    const proLevel = await ProLevel.findOne({ level: doc.level }).lean();
    if (proLevel) {
      doc.level_name_mn = proLevel.name_mn;
      doc.level_name_en = proLevel.name_en;
    }
  }
}

// Populate level names before saving a single document
salaryPostSchema.pre('save', async function (next) {
  if (this.isModified('level')) {
    await setLevelNamesForDoc(this);
  }
  next();
});

// Populate level names for insertMany
salaryPostSchema.pre('insertMany', async function (next, docs) {
  try {
    await Promise.all((docs || []).map((d) => setLevelNamesForDoc(d)));
    next();
  } catch (err) {
    next(err);
  }
});

// Populate level names on findOneAndUpdate when level is updated
salaryPostSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() || {};
  const level = update.level ?? (update.$set && update.$set.level);
  if (typeof level === 'number') {
    try {
      const proLevel = await ProLevel.findOne({ level }).lean();
      if (proLevel) {
        if (update.$set) {
          update.$set.level_name_mn = proLevel.name_mn;
          update.$set.level_name_en = proLevel.name_en;
        } else {
          update.level_name_mn = proLevel.name_mn;
          update.level_name_en = proLevel.name_en;
        }
        this.setUpdate(update);
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('SalaryPost', salaryPostSchema);

