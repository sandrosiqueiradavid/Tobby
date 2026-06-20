require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🐶 TOBBY API v7.0 - INICIANDO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ===== MIDDLEWARES =====
app.use(cors({
  origin: ['https://sandrosiqueiradavid.github.io', 'http://localhost:3000', 'http://localhost:5500'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== LOG DE REQUISIÇÕES =====
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== ROTAS =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/hollerith', require('./routes/hollerith'));
app.use('/api/investment', require('./routes/investment'));
app.use('/api/bank', require('./routes/bank'));
app.use('/api/loans', require('./routes/loan'));
app.use('/api/wealth', require('./routes/wealth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/memory', require('./routes/memory'));
app.use('/api/simulator', require('./routes/simulator'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/goals', require('./routes/financialGoals'));
app.use('/api/emergency-fund', require('./routes/emergency-fund'));
app.use('/api/score', require('./routes/financialScore'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/market-indicators', require('./routes/marketIndicators'));
app.use('/api/cash-forecast', require('./routes/cashForecast'));
app.use('/api/monthly-report', require('./routes/monthlyReport'));
app.use('/api/timeline', require('./routes/timeline'));
app.use('/api/radar', require('./routes/radar'));
app.use('/api/dream-simulator', require('./routes/dreamSimulator'));
app.use('/api/family', require('./routes/family'));

// ===== HEALTH CHECKS =====
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: '🐶 Tobby API v7.0',
    supabase: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's',
    memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB'
  });
});

app.get('/api/diagnose', async (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development'
    },
    supabase_configured: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY
    },
    jwt_configured: !!process.env.JWT_SECRET
  });
});

// ===== 404 =====
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ===== TRATAMENTO DE ERROS =====
app.use((err, req, res, next) => {
  console.error('🔥 Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🐶 Tobby API v7.0 rodando na porta ${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;