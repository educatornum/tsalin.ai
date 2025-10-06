const express = require('express');
const router = express.Router();
const {
  positionsPerIndustry,
  industriesWithZeroPositions,
  distinctSalaryPositionsPerIndustry,
} = require('../controllers/statsController');

router.get('/positions-per-industry', positionsPerIndustry);
router.get('/industries-with-zeros', industriesWithZeroPositions);
router.get('/distinct-salary-positions-per-industry', distinctSalaryPositionsPerIndustry);

module.exports = router;


