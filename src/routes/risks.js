// src/routes/risks.js
const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// ============================================
// ROTAS DE PREVISÃO DE RISCOS
// ============================================

// GET /api/risks - Listar todos os riscos do usuário
router.get('/', riskController.getRisks);

// POST /api/risks/analyze - Analisar e detectar novos riscos
router.post('/analyze', riskController.analyzeRisks);

// PATCH /api/risks/:id/resolve - Marcar um risco como resolvido
router.patch('/:id/resolve', riskController.resolveRisk);

// GET /api/risks/summary - Resumo dos riscos (opcional)
if (typeof riskController.getSummary === 'function') {
  router.get('/summary', riskController.getSummary);
}

// GET /api/risks/history - Histórico de riscos (opcional)
if (typeof riskController.getHistory === 'function') {
  router.get('/history', riskController.getHistory);
}

module.exports = router;