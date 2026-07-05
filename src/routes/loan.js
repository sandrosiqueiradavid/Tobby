// src/routes/loan.js
const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', loanController.getLoans);
router.post('/', loanController.createLoan);
router.post('/:id/simulate', loanController.simulateExtraPayment);
router.delete('/:id', loanController.deleteLoan);

module.exports = router;