require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/hollerith', require('./routes/hollerith'));
app.use('/api/investment', require('./routes/investment'));
app.use('/api/bank', require('./routes/bank'));
app.use('/api/ai-document', require('./routes/aiDocument'));

// Health check
app.get('/', (req, res) => res.json({
  status: 'ok',
  app: '🐶 Tobby API v4.0',
  supabase: !!process.env.SUPABASE_URL,
  ai: !!process.env.CLAUDE_API_KEY
}));

app.get('/health', (req, res) => res.json({
  status: 'OK',
  timestamp: new Date(),
  uptime: Math.floor(process.uptime()) + 's'
}));

// 404
app.use('*', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Erro global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🐶 Tobby API rodando na porta ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
});