require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARES =====
app.use(cors({
  origin: process.env.FRONTEND_URL || ['https://sandrosiqueiradavid.github.io', 'http://localhost:3000', '*'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== LOG DE REQUISIÇÕES (útil para debug) =====
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

// ===== HEALTH CHECKS =====
app.get('/', (req, res) => res.json({
  status: 'ok',
  app: '🐶 Tobby API v5.0',
  supabase: !!process.env.SUPABASE_URL,
  timestamp: new Date().toISOString()
}));

app.get('/health', (req, res) => res.json({
  status: 'OK',
  timestamp: new Date().toISOString(),
  uptime: Math.floor(process.uptime()) + 's',
  memory: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB'
}));

// ===== ENDPOINT DE DIAGNÓSTICO DO SUPABASE =====
app.get('/api/diagnose', async (req, res) => {
  const supabase = require('./db/supabase');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || 3000
    },
    supabase_config: {
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ CONFIGURADO' : '❌ FALTANDO',
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ? '✅ CONFIGURADO' : '❌ FALTANDO',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ CONFIGURADO' : '❌ FALTANDO',
      url_value: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 50) + '...' : null
    },
    connection_test: null,
    tables_check: null
  };
  
  // Teste de conexão básica
  try {
    const startTime = Date.now();
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const latency = Date.now() - startTime;
    
    results.connection_test = {
      success: !error,
      latency_ms: latency,
      error: error ? error.message : null,
      error_code: error ? error.code : null,
      count: count || 0
    };
  } catch (err) {
    results.connection_test = {
      success: false,
      error: err.message,
      stack: err.stack
    };
  }
  
  // Verificar tabelas existentes
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (!error && tables) {
      results.tables_check = {
        success: true,
        tables: tables.map(t => t.table_name).filter(t => ['users', 'bills'].includes(t))
      };
    } else {
      // Fallback: tentar consultar diretamente as tabelas
      const tablesFound = [];
      
      try {
        const { error: usersError } = await supabase.from('users').select('id', { head: true });
        if (!usersError) tablesFound.push('users');
      } catch(e) {}
      
      try {
        const { error: billsError } = await supabase.from('bills').select('id', { head: true });
        if (!billsError) tablesFound.push('bills');
      } catch(e) {}
      
      results.tables_check = {
        success: true,
        tables: tablesFound,
        note: 'Consulta via informação do schema não disponível'
      };
    }
  } catch (err) {
    results.tables_check = {
      success: false,
      error: err.message
    };
  }
  
  // Sugestões baseadas nos erros
  if (results.connection_test && !results.connection_test.success) {
    const errorMsg = results.connection_test.error || '';
    if (errorMsg.includes('Invalid API key')) {
      results.suggestions = ['🔑 A chave de API é inválida. Verifique se está usando a service_role key.'];
    } else if (errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
      results.suggestions = ['📋 As tabelas não existem. Execute o script SQL no Supabase para criar as tabelas users e bills.'];
    } else if (errorMsg.includes('JWT')) {
      results.suggestions = ['🔐 Erro de autenticação. Verifique se está usando a chave correta (service_role).'];
    } else {
      results.suggestions = ['⚠️ Erro desconhecido. Verifique os logs acima.'];
    }
  } else if (results.connection_test && results.connection_test.success && results.tables_check && results.tables_check.tables && results.tables_check.tables.length === 0) {
    results.suggestions = ['📋 Conexão OK, mas tabelas não encontradas. Execute o script SQL no Supabase para criar as tabelas users e bills.'];
  } else if (results.connection_test && results.connection_test.success) {
    results.suggestions = ['✅ Tudo parece estar funcionando! O Supabase está conectado e as tabelas existem.'];
  }
  
  res.json(results);
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

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🐶 Tobby API rodando na porta ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔍 Diagnóstico: http://localhost:${PORT}/api/diagnose`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Mostrar status das variáveis de ambiente
  console.log('\n📋 VARIÁVEIS DE AMBIENTE:');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
  console.log(`  SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SECRET_KEY ? '✅' : '❌'}`);
  console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
  console.log(`  ADMIN_KEY: ${process.env.ADMIN_KEY ? '✅' : '❌'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

module.exports = app;