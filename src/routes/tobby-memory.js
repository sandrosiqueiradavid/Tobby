// src/routes/tobby-memory.js
const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ============================================
// ROTAS DE MEMÓRIA DO TOBBY (VERSÃO 9.0)
// ============================================

// GET /api/tobby-memory/relevant - Listar memórias relevantes
router.get('/relevant', memoryController.getRelevantMemories);

// POST /api/tobby-memory/extract - Extrair memória da conversa
router.post('/extract', memoryController.extractMemory);

// GET /api/tobby-memory/history - Histórico de memórias
router.get('/history', memoryController.getMemoryHistory);

// PATCH /api/tobby-memory/:id/recall - Recordar uma memória
router.patch('/:id/recall', memoryController.recallMemory);

// DELETE /api/tobby-memory/:id - Deletar uma memória
router.delete('/:id', memoryController.deleteMemory);

module.exports = router;