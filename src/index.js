// src/index.js - BACKEND COMPLETO E CORRIGIDO
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors({
  origin: [
    'https://sandrosiqueiradavid.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://tobby-api.onrender.com'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// LOGGING
// ============================================
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ============================================
// ROTAS PÚBLICAS
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    version: '9.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/', (req, res) => {
  res.json({
    name: '🐶 Tobby API',
    version: '9.0.0',
    description: 'API do assistente financeiro Tobby',
    endpoints: {
      health: '/health',
      auth: '/api/auth'
    }
  });
});

// ============================================
// ROTAS DE AUTENTICAÇÃO (Públicas)
// ============================================
app.use('/api/auth', require('./routes/auth'));

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================
const authMiddleware = require('./middleware/auth');

// ============================================
// ROTAS PROTEGIDAS
// ============================================
app.use('/api/user', authMiddleware, require('./routes/user'));
app.use('/api/bills', authMiddleware, require('./routes/bills'));
app.use('/api/investments', authMiddleware, require('./routes/investment'));
app.use('/api/loans', authMiddleware, require('./routes/loan'));
app.use('/api/wealth', authMiddleware, require('./routes/wealth'));
app.use('/api/journal', authMiddleware, require('./routes/journal'));
app.use('/api/life-events', authMiddleware, require('./routes/lifeEvents'));
app.use('/api/retirement', authMiddleware, require('./routes/retirement'));
app.use('/api/missions', authMiddleware, require('./routes/missions'));
app.use('/api/briefing', authMiddleware, require('./routes/briefing'));
app.use('/api/behavior', authMiddleware, require('./routes/behavior'));
app.use('/api/couple', authMiddleware, require('./routes/couple'));
app.use('/api/hollerith', authMiddleware, require('./routes/hollerith'));
app.use('/api/bank', authMiddleware, require('./routes/bank'));
app.use('/api/admin', authMiddleware, require('./routes/admin'));
app.use('/api/memory', authMiddleware, require('./routes/memory'));
app.use('/api/mentor', authMiddleware, require('./routes/mentor'));
app.use('/api/risks', authMiddleware, require('./routes/risks'));
app.use('/api/executive', authMiddleware, require('./routes/executive'));

// ============================================
// ROTAS ADICIONAIS - CORRIGIDAS
// ============================================

// SCORE - Duas rotas para compatibilidade
app.use('/api/score', authMiddleware, require('./routes/financialScore'));
app.use('/api/financial-score', authMiddleware, require('./routes/financialScore'));

// METAS FINANCEIRAS - Rota sem duplicação
app.use('/api/financial-goals', authMiddleware, require('./routes/financialGoals'));

// RESERVA DE EMERGÊNCIA
app.use('/api/emergency-fund', authMiddleware, require('./routes/emergencyFund'));

// CATEGORIAS
app.use('/api/categories', authMiddleware, require('./routes/categories'));

// IA
app.use('/api/ai', authMiddleware, require('./routes/ai'));

// CONQUISTAS
app.use('/api/achievements', authMiddleware, require('./routes/achievements'));

// TIMELINE
app.use('/api/timeline', authMiddleware, require('./routes/timeline'));

// RADAR
app.use('/api/radar', authMiddleware, require('./routes/radar'));

// ============================================
// ROTA 404
// ============================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.url,
    method: req.method
  });
});

// ============================================
// TRATAMENTO DE ERROS GLOBAL
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err.message);
  console.error(err.stack);
  
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Erro interno do servidor',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🐶 TOBBY API v9.0 - BACKEND');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});