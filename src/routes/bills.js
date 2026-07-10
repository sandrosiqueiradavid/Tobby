// src/routes/bills.js
const express = require('express');
const router = express.Router();
const billsController = require('../controllers/billsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ============================================
// ROTAS DE CONTAS - COMPATIBILIDADE TOTAL
// ============================================

// ✅ ROTA CORRETA (com hífen - recomendada)
router.get('/dashboard-summary', billsController.getDashboardSummary);

// 🔄 ROTA DE FALLBACK (com barra - para compatibilidade com versões antigas)
router.get('/dashboard/summary', billsController.getDashboardSummary);

// CRUD de contas
router.get('/', billsController.getBills);
router.get('/:id', billsController.getBill);
router.post('/', billsController.createBill);
router.put('/:id', billsController.updateBill);
router.delete('/:id', billsController.deleteBill);
router.patch('/:id/status', billsController.updateBillStatus);

module.exports = router;