const express = require('express');
const router = express.Router();
const {
  getIndustries,
  getIndustry,
  createIndustry,
  updateIndustry,
  deleteIndustry,
  bulkInsertIndustries,
  getIndustryPositions,
} = require('../controllers/industryController');
const { industryValidationRules } = require('../middleware/validators');

router.post('/bulk', bulkInsertIndustries);

router
  .route('/')
  .get(getIndustries)
  .post(industryValidationRules(), createIndustry);

// Get positions for a specific industry (must be before /:id route)
router.get('/:id/positions', getIndustryPositions);

router
  .route('/:id')
  .get(getIndustry)
  .put(industryValidationRules(), updateIndustry)
  .delete(deleteIndustry);

module.exports = router;

