// src/routes/missions.js
const express = require('express');
const router = express.Router();
const missionsController = require('../controllers/missionsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', missionsController.getMissions);
router.post('/generate', missionsController.generateMissions);
router.patch('/:id/progress', missionsController.updateProgress);
router.post('/:id/complete', missionsController.completeMission);

module.exports = router;