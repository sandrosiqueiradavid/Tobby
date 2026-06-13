const express = require('express');
const router = express.Router();
const decisionSimulator = require('../controllers/decisionSimulator');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', decisionSimulator.simulate);

module.exports = router;