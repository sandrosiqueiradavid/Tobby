const express = require('express');
const router = express.Router();
const wealthController = require('../controllers/wealthController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/summary', wealthController.getWealthSummary);
router.get('/assets', wealthController.getAssets);
router.post('/assets', wealthController.createAsset);
router.delete('/assets/:id', wealthController.deleteAsset);

module.exports = router;