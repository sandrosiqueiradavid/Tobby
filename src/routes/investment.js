const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', investmentController.getInvestments);
router.post('/', investmentController.createInvestment);
router.put('/:id', investmentController.updateInvestment);
router.delete('/:id', investmentController.deleteInvestment);

module.exports = router;