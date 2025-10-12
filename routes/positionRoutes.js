const express = require('express');
const router = express.Router();
const {
  getPositions,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
  bulkInsertPositions,
  getPositionsByIndustry,
  getPositionsWithoutIndustry,
} = require('../controllers/positionController');
const { positionValidationRules } = require('../middleware/validators');

router.post('/bulk', bulkInsertPositions);
router.get('/by-industry/:industry_id', getPositionsByIndustry);
router.get('/without-industry', getPositionsWithoutIndustry);

router
  .route('/')
  .get(getPositions)
  .post(positionValidationRules(), createPosition);

router
  .route('/:id([0-9a-fA-F]{24})')
  .get(getPosition)
  .put(positionValidationRules(), updatePosition)
  .delete(deletePosition);

module.exports = router;

