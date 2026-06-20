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

module.exports = router;