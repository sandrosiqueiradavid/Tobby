const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: '🐶 Tobby API - Servidor rodando!' });
});

// ===== ROTAS DA API =====

// Auth routes
app.post('/api/auth/register', (req, res) => {
  // TODO: Implementar registro
  res.status(201).json({ 
    token: 'fake-token-123',
    user: { id: 1, name: req.body.name, email: req.body.email }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Demo user
  if (email === 'demo@tobby.com' && password === '123456') {
    return res.json({
      token: 'demo-token-123',
      user: { id: 1, name: 'Usuário Demo', email: 'demo@tobby.com', salary: 5000 }
    });
  }
  
  res.status(401).json({ error: 'Credenciais inválidas' });
});

// User routes
app.get('/api/user/profile', (req, res) => {
  res.json({ id: 1, name: 'Usuário Demo', email: 'demo@tobby.com', salary: 5000 });
});

app.put('/api/user/salary', (req, res) => {
  res.json({ salary: req.body.salary, message: 'Salário atualizado' });
});

// Bills routes
app.get('/api/bills', (req, res) => {
  const bills = [
    { id: 1, name: 'Aluguel', value: 1200, due_day: 5, category: 'moradia', status: 'pending' },
    { id: 2, name: 'Luz', value: 150, due_day: 10, category: 'utilidades', status: 'paid' },
    { id: 3, name: 'Internet', value: 89.90, due_day: 15, category: 'utilidades', status: 'pending' }
  ];
  res.json({ data: bills });
});

app.get('/api/bills/dashboard/summary', (req, res) => {
  res.json({
    salary: 5000,
    totalBills: 2500,
    paidBills: 800,
    pendingBills: 1700,
    lateBills: 0,
    freeBalance: 2500,
    percentageCommitted: 50
  });
});

app.post('/api/bills', (req, res) => {
  const newBill = { id: Date.now(), ...req.body };
  res.status(201).json(newBill);
});

app.put('/api/bills/:id', (req, res) => {
  res.json({ id: req.params.id, ...req.body });
});

app.delete('/api/bills/:id', (req, res) => {
  res.json({ message: 'Conta deletada' });
});

app.patch('/api/bills/:id/status', (req, res) => {
  res.json({ id: req.params.id, status: req.body.status });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor Tobby rodando na porta ${port}`);
});
