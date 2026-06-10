const express = require('express');
const router = express.Router();
const aiDocumentController = require('../controllers/aiDocumentController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/upload', aiDocumentController.uploadMiddleware, aiDocumentController.processDocument);
router.post('/process-url', aiDocumentController.processDocumentUrl);

module.exports = router;