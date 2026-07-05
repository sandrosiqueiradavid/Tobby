// src/routes/briefing.js
const express = require('express');
const router = express.Router();
const briefingController = require('../controllers/briefingController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Briefing matinal padrão
router.get('/morning', briefingController.getMorningBriefing);

// Briefing com IA (mais detalhado)
router.get('/ai', briefingController.getAIBriefing);

module.exports = router;