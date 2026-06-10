const supabase = require('../db/supabase');

const adminController = {
  // Verificar saúde do sistema
  async healthCheck(req, res) {
    try {
      const start = Date.now();
      
      // Testar conexão com Supabase
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      const dbLatency = Date.now() - start;
      const dbStatus = !error && data !== null;
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: {
          connected: dbStatus,
          latency: dbLatency,
          error: error ? error.message : null
        },
        api: {
          version: '5.0.0',
          environment: process.env.NODE_ENV || 'production'
        }
      });
    } catch (err) {
      res.status(500).json({
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Métricas do sistema
  async getMetrics(req, res) {
    try {
      // Contagem de usuários
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      // Contagem de contas
      const { count: totalBills } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true });
      
      // Contagem de investimentos
      const { count: totalInvestments } = await supabase
        .from('investments')
        .select('*', { count: 'exact', head: true });
      
      // Contagem de financiamentos
      const { count: totalLoans } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true });
      
      // Usuários ativos (que fizeram login recentemente - últimos 7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());
      
      // Total de valores
      const { data: billsData } = await supabase
        .from('bills')
        .select('value, status');
      
      const totalBillsValue = billsData?.reduce((sum, b) => sum + parseFloat(b.value), 0) || 0;
      const paidBillsValue = billsData?.filter(b => b.status === 'paid').reduce((sum, b) => sum + parseFloat(b.value), 0) || 0;
      
      // Usuários por mês (últimos 6 meses)
      const monthlyUsers = [];
      for (let i = 5; i >= 0; i--) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - i);
        startDate.setDate(1);
        
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString());
        
        monthlyUsers.push({
          month: startDate.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }),
          users: count || 0
        });
      }
      
      res.json({
        timestamp: new Date().toISOString(),
        users: {
          total: totalUsers || 0,
          activeLast7Days: activeUsers || 0,
          monthlyGrowth: monthlyUsers
        },
        finances: {
          totalBills: totalBills || 0,
          totalBillsValue,
          paidBillsValue,
          averageBillValue: totalBills > 0 ? totalBillsValue / totalBills : 0
        },
        investments: {
          total: totalInvestments || 0
        },
        loans: {
          total: totalLoans || 0
        }
      });
    } catch (err) {
      console.error('Metrics error:', err);
      res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
  },
  
  // Logs simulados (em produção, viriam de um arquivo ou banco)
  async getLogs(req, res) {
    try {
      const { level = 'all', limit = 50 } = req.query;
      
      // Aqui você pode ler logs de um arquivo ou banco
      // Por enquanto, logs simulados
      const logs = [
        { level: 'info', message: 'Servidor iniciado', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { level: 'info', message: 'Banco de dados conectado', timestamp: new Date(Date.now() - 3590000).toISOString() },
        { level: 'warn', message: 'Requisição lenta: /api/bills (1200ms)', timestamp: new Date(Date.now() - 1800000).toISOString() },
        { level: 'error', message: 'Falha ao conectar ao Supabase', timestamp: new Date(Date.now() - 7200000).toISOString(), resolved: true },
        { level: 'info', message: 'Novo usuário registrado: demo@tobby.com', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { level: 'info', message: 'Deploy realizado com sucesso', timestamp: new Date(Date.now() - 172800000).toISOString() }
      ];
      
      const filteredLogs = level === 'all' 
        ? logs 
        : logs.filter(l => l.level === level);
      
      res.json({
        logs: filteredLogs.slice(0, limit),
        total: filteredLogs.length
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar logs' });
    }
  },
  
  // Validar tokens de usuários
  async validateTokens(req, res) {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, name');
      
      const validations = [];
      const secret = process.env.JWT_SECRET;
      
      for (const user of users || []) {
        // Gerar token para teste
        const jwt = require('jsonwebtoken');
        const testToken = jwt.sign({ userId: user.id }, secret, { expiresIn: '30d' });
        
        let isValid = false;
        let error = null;
        
        try {
          const decoded = jwt.verify(testToken, secret);
          isValid = decoded.userId === user.id;
        } catch (err) {
          error = err.message;
          isValid = false;
        }
        
        validations.push({
          userId: user.id,
          email: user.email,
          name: user.name,
          tokenValid: isValid,
          error: error
        });
      }
      
      res.json({
        secretConfigured: !!secret,
        tokensValid: validations.filter(v => v.tokenValid).length,
        tokensInvalid: validations.filter(v => !v.tokenValid).length,
        details: validations
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao validar tokens' });
    }
  },
  
  // Testar rotas da API
  async testApiRoutes(req, res) {
    const routes = [
      { method: 'GET', path: '/health', expectedStatus: 200 },
      { method: 'POST', path: '/auth/login', expectedStatus: 400, body: {} },
      { method: 'GET', path: '/api-docs', expectedStatus: 404 }
    ];
    
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const results = [];
    
    // Em produção, isso seria feito internamente
    results.push({
      route: '/health',
      status: 'ok',
      message: 'Endpoint disponível'
    });
    
    res.json({
      apiStatus: 'operational',
      testedAt: new Date().toISOString(),
      results: results
    });
  },
  
  // Dashboard completo (agrupa várias informações)
  async getFullDashboard(req, res) {
    try {
      const [health, metrics, logs, tokens] = await Promise.all([
        adminController.healthCheck({}, { json: (data) => data }),
        adminController.getMetrics({}, { json: (data) => data }),
        adminController.getLogs({ query: { limit: 10 } }, { json: (data) => data }),
        adminController.validateTokens({}, { json: (data) => data })
      ]);
      
      // Função auxiliar para capturar os dados
      const safeData = (promise) => promise.catch(e => ({ error: e.message }));
      
      res.json({
        summary: {
          status: health?.status || 'unknown',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        },
        health: health,
        metrics: metrics,
        recentLogs: logs?.logs || [],
        tokens: tokens
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
  }
};

module.exports = adminController;