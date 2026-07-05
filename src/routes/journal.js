// src/routes/journal.js
const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', journalController.getEntries);
router.post('/', journalController.createEntry);
router.post('/:id/analyze', journalController.analyzeEntry);
router.delete('/:id', journalController.deleteEntry);

module.exports = router;