const express = require('express');
const router = express.Router();
const {
  getProLevels,
  getProLevel,
  getProLevelByNumber,
  bulkInsertProLevels,
} = require('../controllers/proLevelController');

router.post('/bulk', bulkInsertProLevels);
router.get('/level/:level', getProLevelByNumber);

router.route('/').get(getProLevels);

router.route('/:id').get(getProLevel);

module.exports = router;

