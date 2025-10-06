const { body } = require('express-validator');

exports.userValidationRules = () => {
  return [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('age')
      .optional()
      .isInt({ min: 0, max: 120 })
      .withMessage('Age must be between 0 and 120'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ];
};

exports.industryValidationRules = () => {
  return [
    body('name_mn')
      .trim()
      .notEmpty()
      .withMessage('Mongolian name is required'),
    body('name_en')
      .trim()
      .notEmpty()
      .withMessage('English name is required'),
    body('description')
      .optional()
      .trim(),
    body('average_salary')
      .trim()
      .notEmpty()
      .withMessage('Average salary is required'),
    body('sort_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ];
};

exports.positionValidationRules = () => {
  return [
    body('industry_id')
      .notEmpty()
      .withMessage('Industry ID is required'),
    body('industry_sort_order')
      .isInt({ min: 1, max: 25 })
      .withMessage('Industry sort order must be between 1 and 25'),
    body('name_mn')
      .trim()
      .notEmpty()
      .withMessage('Mongolian name is required'),
    body('name_en')
      .trim()
      .notEmpty()
      .withMessage('English name is required'),
    body('sort_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ];
};

exports.salaryPostValidationRules = () => {
  return [
    body('industry_id')
      .notEmpty()
      .withMessage('Industry ID is required'),
    body('position_id')
      .notEmpty()
      .withMessage('Position ID is required'),
    body('source')
      .optional()
      .isIn(['user_submission', 'cv_upload', 'lambda', 'third_party', 'other'])
      .withMessage('Invalid source type'),
    body('salary')
      .isFloat({ min: 0 })
      .withMessage('Salary must be a positive number'),
    body('level')
      .isInt({ min: 1, max: 10 })
      .withMessage('Level must be between 1 and 10'),
    body('experience_years')
      .isInt({ min: 0, max: 50 })
      .withMessage('Experience years must be between 0 and 50'),
    body('is_verified')
      .optional()
      .isBoolean()
      .withMessage('is_verified must be a boolean'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ];
};

