const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Middleware de autenticação do admin
const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const validKey = process.env.ADMIN_KEY || 'tobbyadmin2024';
  
  if (adminKey === validKey) {
    next();
  } else {
    res.status(401).json({ error: 'Acesso não autorizado' });
  }
};

// Aplicar autenticação em todas as rotas
router.use(adminAuth);

// Verificar se cada função existe antes de usar
if (adminController.healthCheck) router.get('/health', adminController.healthCheck);
else console.error('❌ adminController.healthCheck não encontrado');

if (adminController.getMetrics) router.get('/metrics', adminController.getMetrics);
else console.error('❌ adminController.getMetrics não encontrado');

if (adminController.getLogs) router.get('/logs', adminController.getLogs);
else console.error('❌ adminController.getLogs não encontrado');

if (adminController.validateSystem) router.get('/validate', adminController.validateSystem);
else console.error('❌ adminController.validateSystem não encontrado');

if (adminController.testApiRoutes) router.get('/test-api', adminController.testApiRoutes);
else console.error('❌ adminController.testApiRoutes não encontrado');

if (adminController.getFullDashboard) router.get('/dashboard', adminController.getFullDashboard);
else console.error('❌ adminController.getFullDashboard não encontrado');

module.exports = router;