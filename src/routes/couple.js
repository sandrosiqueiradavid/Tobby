const express = require('express');
const router = express.Router();
const coupleController = require('../controllers/coupleController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/create', coupleController.createCouple);
router.get('/', coupleController.getCouple);
router.post('/goals/share', coupleController.shareGoal);

module.exports = router;