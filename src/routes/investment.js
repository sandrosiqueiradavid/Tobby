const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/news', investmentController.getNews);
router.get('/recommendations', investmentController.getRecommendations);

module.exports = router;