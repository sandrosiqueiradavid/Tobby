const express = require('express');
const billsController = require('../controllers/billsController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', billsController.getBills);
router.get('/dashboard/summary', billsController.getDashboardSummary || billsController.getSummary);
router.get('/:id', billsController.getBill);
router.post('/', billsController.createBill);
router.put('/:id', billsController.updateBill);
router.delete('/:id', billsController.deleteBill);
router.patch('/:id/status', billsController.updateBillStatus);

module.exports = router;
