const express = require('express');
const router = express.Router();
const hollerithController = require('../controllers/hollerithController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/process', hollerithController.processHollerith);
router.get('/report', hollerithController.generateIncomeReport);
router.get('/ir-declaration', hollerithController.generateIRDeclaration);

module.exports = router;