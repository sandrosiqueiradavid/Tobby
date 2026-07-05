// src/routes/retirement.js
const express = require('express');
const router = express.Router();
const retirementController = require('../controllers/retirementController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', retirementController.getPlan);
router.post('/', retirementController.savePlan);
router.post('/simulate', retirementController.simulateRetirement);

module.exports = router;