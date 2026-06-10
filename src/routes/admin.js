const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Todas as rotas de admin são protegidas por uma senha simples
// Em produção, use autenticação mais robusta

const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const validKey = process.env.ADMIN_KEY || 'tobbyadmin2024';
  
  if (adminKey === validKey) {
    next();
  } else {
    res.status(401).json({ error: 'Acesso não autorizado' });
  }
};

router.use(adminAuth);

router.get('/health', adminController.healthCheck);
router.get('/metrics', adminController.getMetrics);
router.get('/logs', adminController.getLogs);
router.get('/tokens', adminController.validateTokens);
router.get('/test-api', adminController.testApiRoutes);
router.get('/dashboard', adminController.getFullDashboard);

module.exports = router;