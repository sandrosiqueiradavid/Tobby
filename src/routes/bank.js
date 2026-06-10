const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.post('/process', bankController.processBankExtract);

module.exports = router;