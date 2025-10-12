const express = require('express');
const router = express.Router();
const { getMajors } = require('../controllers/majorController');

router.get('/', getMajors);

module.exports = router;


