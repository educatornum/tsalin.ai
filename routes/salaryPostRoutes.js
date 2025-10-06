const express = require('express');
const router = express.Router();
const {
  getSalaryPosts,
  getSalaryPost,
  createSalaryPost,
  updateSalaryPost,
  deleteSalaryPost,
  bulkInsertSalaryPosts,
  getSalaryStats,
} = require('../controllers/salaryPostController');
const { salaryPostValidationRules } = require('../middleware/validators');

router.post('/bulk', bulkInsertSalaryPosts);
router.get('/stats/:industry_id/:position_id', getSalaryStats);

router
  .route('/')
  .get(getSalaryPosts)
  .post(salaryPostValidationRules(), createSalaryPost);

router
  .route('/:id')
  .get(getSalaryPost)
  .put(salaryPostValidationRules(), updateSalaryPost)
  .delete(deleteSalaryPost);

module.exports = router;

