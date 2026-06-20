const express = require('express');
const router = express.Router();
const briefingController = require('../controllers/briefingController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/morning', briefingController.getMorningBriefing);

module.exports = router;