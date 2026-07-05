// src/routes/executive.js
const express = require('express');
const router = express.Router();
const executiveController = require('../controllers/executiveController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/executive - Dashboard executivo completo
router.get('/', executiveController.getExecutiveDashboard);

module.exports = router;