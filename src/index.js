require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// ===== VERIFICAÇÃO DE CRIPTOGRAFIA =====
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
  console.warn('⚠️ ENCRYPTION_KEY não configurada corretamente!');
  console.warn('💡 Gere uma chave com: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
}

// ===== MIDDLEWARES =====
app.use(cors({
  origin: process.env.FRONTEND_URL || ['https://sandrosiqueiradavid.github.io', 'http://localhost:3000', '*'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== LOG DE REQUISIÇÕES =====
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== ROTAS DA API =====
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
app.use('/api/market', require('./routes/market'));

// ===== HEALTH CHECKS =====
app.get('/', (req, res) => res.json({
  status: 'ok',
  app: '🐶 Tobby API v5.0',
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

// ===== ENDPOINT DE DIAGNÓSTICO =====
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

// ===== 404 =====
app.use('*', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// ===== TRATAMENTO DE ERROS GLOBAL =====
app.use((err, req, res, next) => {
  console.error('🔥 Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ===== AGENDADOR DE RELATÓRIOS SEMANAIS =====
if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
  try {
    const { scheduleWeeklyReports } = require('./jobs/weeklyReportJob');
    scheduleWeeklyReports();
    console.log('📧 Agendador de relatórios semanais iniciado');
  } catch (err) {
    console.warn('⚠️ Erro ao iniciar agendador de relatórios:', err.message);
  }
}

// ===== INICIAR SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🐶 Tobby API rodando na porta ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔍 Diagnóstico: http://localhost:${PORT}/api/diagnose`);
  console.log(`🔐 Criptografia: ${process.env.ENCRYPTION_KEY ? '✅ ATIVA' : '❌ INATIVA'}`);
  console.log(`🤖 Groq API: ${process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '12345' ? '✅ CONFIGURADA' : '⚠️ EM MODO DEMO'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 VARIÁVEIS DE AMBIENTE:');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
  console.log(`  SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SECRET_KEY ? '✅' : '❌'}`);
  console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
  console.log(`  ADMIN_KEY: ${process.env.ADMIN_KEY ? '✅' : '❌'}`);
  console.log(`  ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? '✅' : '❌'}`);
  console.log(`  GROQ_API_KEY: ${process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '12345' ? '✅' : '❌'}`);
  console.log(`  RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅' : '❌'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧠 Rotas ativas:');
  console.log('  - /api/auth (autenticação)');
  console.log('  - /api/user (perfil)');
  console.log('  - /api/bills (contas)');
  console.log('  - /api/investment (investimentos)');
  console.log('  - /api/loans (financiamentos)');
  console.log('  - /api/wealth (patrimônio)');
  console.log('  - /api/memory (memória da IA)');
  console.log('  - /api/simulator (simulador de decisões)');
  console.log('  - /api/ai (chat com IA)');
  console.log('  - /api/market (indicadores de mercado)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;