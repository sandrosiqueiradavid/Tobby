// src/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO DO ADMIN
// ============================================
const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const validKey = process.env.ADMIN_KEY || 'tobbyadmin2024';
  
  console.log('[ADMIN] 🔐 Tentativa de acesso admin');
  console.log('[ADMIN] 📝 Admin Key recebida:', adminKey ? '✅ Presente' : '❌ Ausente');
  
  if (!adminKey) {
    console.warn('[ADMIN] ⚠️ Chave admin não fornecida');
    return res.status(401).json({ 
      error: 'Chave de administrador não fornecida',
      code: 'ADMIN_KEY_MISSING'
    });
  }
  
  if (adminKey === validKey) {
    console.log('[ADMIN] ✅ Acesso autorizado');
    next();
  } else {
    console.warn('[ADMIN] ❌ Chave admin inválida');
    res.status(401).json({ 
      error: 'Acesso não autorizado',
      code: 'ADMIN_KEY_INVALID'
    });
  }
};

// ============================================
// MIDDLEWARE DE RATE LIMITING PARA ADMIN
// ============================================
const adminRateLimit = (req, res, next) => {
  const adminRequests = global.adminRequests || {};
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!adminRequests[ip]) {
    adminRequests[ip] = { count: 0, resetTime: now + 60000 };
  }
  
  if (now > adminRequests[ip].resetTime) {
    adminRequests[ip].count = 0;
    adminRequests[ip].resetTime = now + 60000;
  }
  
  adminRequests[ip].count++;
  
  if (adminRequests[ip].count > 30) {
    console.warn(`[ADMIN] ⚠️ Rate limit excedido para IP: ${ip}`);
    return res.status(429).json({ 
      error: 'Muitas requisições. Tente novamente em 1 minuto.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  global.adminRequests = adminRequests;
  next();
};

// ============================================
// APLICAR MIDDLEWARES
// ============================================
router.use(adminAuth);
router.use(adminRateLimit);

// ============================================
// ROTAS ADMINISTRATIVAS
// ============================================

// GET /api/admin/health - Verificar saúde do sistema
if (typeof adminController.healthCheck === 'function') {
  router.get('/health', adminController.healthCheck);
} else {
  console.error('❌ adminController.healthCheck não encontrado');
  router.get('/health', (req, res) => {
    res.status(501).json({ error: 'Health check não implementado' });
  });
}

// GET /api/admin/metrics - Métricas do sistema
if (typeof adminController.getMetrics === 'function') {
  router.get('/metrics', adminController.getMetrics);
} else {
  console.error('❌ adminController.getMetrics não encontrado');
  router.get('/metrics', (req, res) => {
    res.status(501).json({ error: 'Métricas não implementadas' });
  });
}

// GET /api/admin/logs - Logs do sistema
if (typeof adminController.getLogs === 'function') {
  router.get('/logs', adminController.getLogs);
} else {
  console.error('❌ adminController.getLogs não encontrado');
  router.get('/logs', (req, res) => {
    res.status(501).json({ error: 'Logs não implementados' });
  });
}

// GET /api/admin/validate - Validar configuração do sistema
if (typeof adminController.validateSystem === 'function') {
  router.get('/validate', adminController.validateSystem);
} else {
  console.error('❌ adminController.validateSystem não encontrado');
  router.get('/validate', (req, res) => {
    res.status(501).json({ error: 'Validação não implementada' });
  });
}

// GET /api/admin/test-api - Testar rotas da API
if (typeof adminController.testApiRoutes === 'function') {
  router.get('/test-api', adminController.testApiRoutes);
} else {
  console.error('❌ adminController.testApiRoutes não encontrado');
  router.get('/test-api', (req, res) => {
    res.status(501).json({ error: 'Teste de API não implementado' });
  });
}

// GET /api/admin/dashboard - Dashboard completo do admin
if (typeof adminController.getFullDashboard === 'function') {
  router.get('/dashboard', adminController.getFullDashboard);
} else {
  console.error('❌ adminController.getFullDashboard não encontrado');
  router.get('/dashboard', (req, res) => {
    res.status(501).json({ error: 'Dashboard não implementado' });
  });
}

// ============================================
// ROTAS ADICIONAIS (OPCIONAIS)
// ============================================

// GET /api/admin/users - Listar usuários
if (typeof adminController.getUsers === 'function') {
  router.get('/users', adminController.getUsers);
} else {
  console.log('ℹ️ adminController.getUsers não implementado');
}

// GET /api/admin/system-info - Informações do sistema
if (typeof adminController.getSystemInfo === 'function') {
  router.get('/system-info', adminController.getSystemInfo);
} else {
  console.log('ℹ️ adminController.getSystemInfo não implementado');
}

// POST /api/admin/clear-cache - Limpar cache
if (typeof adminController.clearCache === 'function') {
  router.post('/clear-cache', adminController.clearCache);
} else {
  console.log('ℹ️ adminController.clearCache não implementado');
}

// POST /api/admin/run-job - Executar job manualmente
if (typeof adminController.runJob === 'function') {
  router.post('/run-job', adminController.runJob);
} else {
  console.log('ℹ️ adminController.runJob não implementado');
}

// ============================================
// MIDDLEWARE DE LOG PARA ADMIN
// ============================================
router.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[ADMIN] 📝 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ============================================
// TRATAMENTO DE ERROS DAS ROTAS ADMIN
// ============================================
router.use((err, req, res, next) => {
  console.error('[ADMIN] ❌ Erro:', err.message);
  res.status(500).json({
    error: 'Erro interno no painel administrativo',
    message: err.message,
    code: 'ADMIN_INTERNAL_ERROR'
  });
});

module.exports = router;