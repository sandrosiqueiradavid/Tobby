// src/routes/mentor.js
const express = require('express');
const router = express.Router();
const mentorController = require('../controllers/mentorController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// ============================================
// ROTAS DO MENTOR FINANCEIRO
// ============================================

// POST /api/mentor/create-plan - Criar um novo plano do mentor
router.post('/create-plan', mentorController.createPlan);

// GET /api/mentor/current-plan - Obter o plano ativo atual
router.get('/current-plan', mentorController.getCurrentPlan);

// PATCH /api/mentor/update-progress - Atualizar progresso do plano
router.patch('/update-progress', mentorController.updateProgress);

// GET /api/mentor/history - Histórico de planos do mentor
router.get('/history', mentorController.getPlanHistory);

module.exports = router;