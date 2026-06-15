require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ===== MIDDLEWARES BÁSICOS =====
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== VERIFICAÇÃO DE CRIPTOGRAFIA =====
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
  console.warn('⚠️ ENCRYPTION_KEY não configurada corretamente!');
}

// ===== LOG DE REQUISIÇÕES =====
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== FUNÇÃO DE DEPURAÇÃO PARA ROTAS =====
function addRoute(path, routePath) {
  try {
    console.log(`🔧 Carregando rota: ${path} -> ${routePath}`);
    const route = require(routePath);
    console.log(`   Tipo: ${typeof route}`);
    if (typeof route === 'function' || route && typeof route === 'object' && route.handle) {
      app.use(path, route);
      console.log(`   ✅ Rota ${path} carregada com sucesso`);
    } else {
      console.error(`   ❌ ERRO: Rota ${path} não é uma função middleware válida`);
      console.error(`   Tipo recebido: ${typeof route}`);
    }
  } catch (err) {
    console.error(`   ❌ ERRO ao carregar ${path}:`, err.message);
  }
}

// ===== ROTAS DA API (com depuração) =====
addRoute('/api/auth', './routes/auth');
addRoute('/api/user', './routes/user');
addRoute('/api/bills', './routes/bills');
addRoute('/api/hollerith', './routes/hollerith');
addRoute('/api/investment', './routes/investment');
addRoute('/api/bank', './routes/bank');
addRoute('/api/loans', './routes/loan');
addRoute('/api/wealth', './routes/wealth');
addRoute('/api/admin', './routes/admin');
addRoute('/api/memory', './routes/memory');
addRoute('/api/simulator', './routes/simulator');
addRoute('/api/ai', './routes/ai');
addRoute('/api/goals', './routes/financialGoals');
addRoute('/api/emergency-fund', './routes/emergencyFund');
addRoute('/api/score', './routes/financialScore');
addRoute('/api/achievements', './routes/achievements');
addRoute('/api/categories', './routes/categories');
addRoute('/api/market-indicators', './routes/marketIndicators');
addRoute('/api/cash-forecast', './routes/cashForecast');
addRoute('/api/monthly-report', './routes/monthlyReport');
addRoute('/api/timeline', './routes/timeline');
addRoute('/api/radar', './routes/radar');
addRoute('/api/dream-simulator', './routes/dreamSimulator');
addRoute('/api/family', './routes/family');

// ===== HEALTH CHECKS =====
app.get('/', (req, res) => res.json({
  status: 'ok',
  app: '🐶 Tobby API v7.0',
  supabase: !!process.env.SUPABASE_URL,
  encryption: !!process.env.ENCRYPTION_KEY,
  groq: !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '12345',
  timestamp: new Date().toISOString()
}));

app.get('/health', (req, res) => res.json({
  status: 'OK',
  timestamp: new Date().toISOString(),
  uptime: Math.floor(process.uptime()) + 's',
  memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB'
}));

app.get('/api/diagnose', async (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      encryption_key_configured: !!process.env.ENCRYPTION_KEY,
      groq_key_configured: !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '12345'
    },
    supabase_configured: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY
    },
    jwt_configured: !!process.env.JWT_SECRET,
    admin_configured: !!process.env.ADMIN_KEY
  });
});

app.use('*', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use((err, req, res, next) => {
  console.error('🔥 Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
  try {
    const { scheduleWeeklyReports } = require('./jobs/weeklyReportJob');
    scheduleWeeklyReports();
    console.log('📧 Agendador de relatórios semanais iniciado');
  } catch (err) {
    console.warn('⚠️ Erro ao iniciar agendador de relatórios:', err.message);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🐶 Tobby API v7.0 rodando na porta ${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;