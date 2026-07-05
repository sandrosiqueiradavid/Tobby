// src/routes/behavior.js
const express = require('express');
const router = express.Router();
const behaviorController = require('../controllers/behaviorController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/alerts', behaviorController.getAlerts);
router.patch('/alerts/:id/read', behaviorController.markAsRead);
router.post('/analyze', behaviorController.analyzeBehavior);

module.exports = router;