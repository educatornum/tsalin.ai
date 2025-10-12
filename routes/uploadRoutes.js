const express = require('express');
const multer = require('multer');
const router = express.Router();
const { uploadCv } = require('../controllers/uploadController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/cv', upload.single('file'), uploadCv);

module.exports = router;


