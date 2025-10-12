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
  getSalaryPostsByIndustryAndMajor,
  filterSalaryPosts,
  estimateSalary,
} = require('../controllers/salaryPostController');
const { salaryPostValidationRules } = require('../middleware/validators');

router.post('/bulk', bulkInsertSalaryPosts);
router.get('/stats/:industry_id/:position_id', getSalaryStats);
router.get('/by-major', getSalaryPostsByIndustryAndMajor);
router.post('/filter', filterSalaryPosts);
router.post('/estimate', estimateSalary);

router
  .route('/')
  .get(getSalaryPosts)
  .post(salaryPostValidationRules(), createSalaryPost);

router
  .route('/:id([0-9a-fA-F]{24})')
  .get(getSalaryPost)
  .put(salaryPostValidationRules(), updateSalaryPost)
  .delete(deleteSalaryPost);

module.exports = router;

