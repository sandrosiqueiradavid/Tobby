const express = require('express');
const router = express.Router();
const hollerithController = require('../controllers/hollerithController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Verificar se as funções existem antes de usá-las
if (hollerithController.processHollerith) {
  router.post('/process', hollerithController.processHollerith);
} else {
  console.error('❌ hollerithController.processHollerith não encontrado');
}

if (hollerithController.generateIncomeReport) {
  router.get('/report', hollerithController.generateIncomeReport);
} else {
  console.error('❌ hollerithController.generateIncomeReport não encontrado');
}

if (hollerithController.generateIRDeclaration) {
  router.get('/ir-declaration', hollerithController.generateIRDeclaration);
} else {
  console.error('❌ hollerithController.generateIRDeclaration não encontrado');
}

module.exports = router;