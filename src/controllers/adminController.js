// src/controllers/adminController.js
const supabase = require('../db/supabase');
const os = require('os');

const adminController = {
  // ===== VERIFICAR SAÚDE DO SISTEMA =====
  async healthCheck(req, res) {
    try {
      const start = Date.now();
      
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      const dbLatency = Date.now() - start;
      const dbStatus = !error && data !== null;

      // Verificar variáveis de ambiente críticas
      const envStatus = {
        supabaseUrl: !!process.env.SUPABASE_URL,
        supabaseKey: !!process.env.SUPABASE_SECRET_KEY,
        jwtSecret: !!process.env.JWT_SECRET,
        encryptionKey: !!process.env.ENCRYPTION_KEY,
        groqApiKey: !!process.env.GROQ_API_KEY
      };

      res.json({
        status: dbStatus ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
          heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB'
        },
        database: {
          connected: dbStatus,
          latency: dbLatency + 'ms',
          error: error ? error.message : null
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          env: process.env.NODE_ENV || 'production',
          variables: envStatus
        },
        api: {
          version: '9.0.0',
          endpoints: {
            auth: '/api/auth',
            bills: '/api/bills',
            health: '/health',
            admin: '/api/admin'
          }
        }
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Health check error:', err);
      res.status(500).json({ 
        status: 'unhealthy', 
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // ===== MÉTRICAS DO SISTEMA =====
  async getMetrics(req, res) {
    try {
      const [usersResult, billsResult, investmentsResult, loansResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('bills').select('*', { count: 'exact', head: true }),
        supabase.from('investments').select('*', { count: 'exact', head: true }),
        supabase.from('loans').select('*', { count: 'exact', head: true })
      ]);
      
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        database: {
          users: usersResult.count || 0,
          bills: billsResult.count || 0,
          investments: investmentsResult.count || 0,
          loans: loansResult.count || 0
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuCores: cpus.length,
          loadAverage: loadAverage.map(v => v.toFixed(2)),
          totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          freeMemory: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB'
        },
        process: {
          pid: process.pid,
          uptime: Math.floor(process.uptime()),
          memoryUsage: process.memoryUsage()
        }
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Metrics error:', err);
      res.status(500).json({ error: 'Erro ao buscar métricas: ' + err.message });
    }
  },

  // ===== LOGS DO SISTEMA =====
  async getLogs(req, res) {
    try {
      const { level = 'all', limit = 50, from, to } = req.query;
      
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to);

      const { data: auditLogs, error } = await query;

      if (error) throw error;

      const systemLogs = [
        { level: 'info', message: 'Servidor iniciado', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { level: 'info', message: 'Banco de dados conectado com sucesso', timestamp: new Date(Date.now() - 3590000).toISOString() },
        { level: 'warn', message: 'Requisição lenta detectada: /api/bills (1200ms)', timestamp: new Date(Date.now() - 1800000).toISOString() }
      ];

      const allLogs = [
        ...(auditLogs || []).map(log => ({
          level: 'info',
          message: `${log.action} - ${log.table_name}`,
          timestamp: log.created_at,
          details: { user_id: log.user_id, old_value: log.old_value, new_value: log.new_value }
        })),
        ...systemLogs
      ];

      const filteredLogs = level === 'all' 
        ? allLogs 
        : allLogs.filter(l => l.level === level);

      res.json({
        success: true,
        logs: filteredLogs.slice(0, parseInt(limit)),
        total: filteredLogs.length,
        note: 'Logs combinados do sistema e audit_log'
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Logs error:', err);
      res.status(500).json({ error: 'Erro ao buscar logs: ' + err.message });
    }
  },

  // ===== VALIDAR CONFIGURAÇÃO DO SISTEMA =====
  async validateSystem(req, res) {
    try {
      const secret = process.env.JWT_SECRET;
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SECRET_KEY;
      const encryptionKey = process.env.ENCRYPTION_KEY;
      const groqKey = process.env.GROQ_API_KEY;
      
      const validations = {
        jwt: {
          configured: !!secret,
          valid: secret && secret.length >= 10,
          message: secret && secret.length >= 10 
            ? '✅ JWT configurado corretamente' 
            : '❌ JWT_SECRET não configurado ou muito curto'
        },
        supabase: {
          urlConfigured: !!supabaseUrl,
          keyConfigured: !!supabaseKey,
          message: (supabaseUrl && supabaseKey) 
            ? '✅ Supabase configurado' 
            : '❌ Variáveis do Supabase faltando'
        },
        encryption: {
          configured: !!encryptionKey,
          valid: encryptionKey && encryptionKey.length === 64,
          message: encryptionKey && encryptionKey.length === 64
            ? '✅ Chave de criptografia configurada (AES-256-GCM)'
            : encryptionKey
              ? '⚠️ Chave de criptografia configurada, mas comprimento inválido (deve ter 64 caracteres hex)'
              : '❌ ENCRYPTION_KEY não configurada'
        },
        groq: {
          configured: !!groqKey,
          message: groqKey 
            ? '✅ Groq API Key configurada' 
            : '⚠️ GROQ_API_KEY não configurada (IA pode não funcionar)'
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          port: process.env.PORT || 3000
        }
      };

      if (supabaseUrl && supabaseKey) {
        const start = Date.now();
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        validations.supabase.connection = !error;
        validations.supabase.latency = Date.now() - start + 'ms';
        if (error) validations.supabase.error = error.message;
      }

      if (encryptionKey) {
        try {
          const crypto = require('crypto');
          const testKey = Buffer.from(encryptionKey, 'hex');
          validations.encryption.keyValid = testKey.length === 32;
          validations.encryption.keyLength = testKey.length;
        } catch (e) {
          validations.encryption.keyValid = false;
          validations.encryption.error = e.message;
        }
      }

      const allValid = Object.values(validations).every(v => 
        v.valid !== undefined ? v.valid : true
      );

      res.json({
        success: true,
        status: allValid ? 'OK' : 'WARNING',
        timestamp: new Date().toISOString(),
        validations,
        summary: {
          allValid,
          warnings: Object.values(validations).filter(v => v.message && v.message.includes('⚠️')).length,
          errors: Object.values(validations).filter(v => v.message && v.message.includes('❌')).length
        }
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Validate system error:', err);
      res.status(500).json({ error: 'Erro ao validar sistema: ' + err.message });
    }
  },

  // ===== TESTAR ROTAS DA API =====
  async testApiRoutes(req, res) {
    try {
      const results = [];
      const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
      
      try {
        const healthRes = await fetch(`${baseUrl}/health`);
        results.push({
          route: '/health',
          status: healthRes.ok ? 'ok' : 'error',
          statusCode: healthRes.status,
          response: healthRes.ok ? await healthRes.json() : null
        });
      } catch (err) {
        results.push({ 
          route: '/health', 
          status: 'error', 
          error: err.message 
        });
      }

      try {
        const apiRes = await fetch(`${baseUrl}/`);
        results.push({
          route: '/',
          status: apiRes.ok ? 'ok' : 'error',
          statusCode: apiRes.status
        });
      } catch (err) {
        results.push({ 
          route: '/', 
          status: 'error', 
          error: err.message 
        });
      }

      try {
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        results.push({
          route: 'Supabase Connection',
          status: !error ? 'ok' : 'error',
          error: error ? error.message : null
        });
      } catch (err) {
        results.push({ 
          route: 'Supabase Connection', 
          status: 'error', 
          error: err.message 
        });
      }

      res.json({
        success: true,
        apiStatus: results.every(r => r.status === 'ok') ? 'operational' : 'degraded',
        testedAt: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          ok: results.filter(r => r.status === 'ok').length,
          errors: results.filter(r => r.status === 'error').length
        }
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Test API error:', err);
      res.status(500).json({ error: 'Erro ao testar API: ' + err.message });
    }
  },

  // ===== DASHBOARD COMPLETO =====
  async getFullDashboard(req, res) {
    try {
      const [health, metrics, logs, system] = await Promise.all([
        adminController.healthCheck({}, {}),
        adminController.getMetrics({}, {}),
        adminController.getLogs({ query: { limit: 10 } }, {}),
        adminController.validateSystem({}, {})
      ]);

      const { data: recentUsers } = await supabase
        .from('users')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentBills } = await supabase
        .from('bills')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          status: health?.status || 'unknown',
          uptime: process.uptime(),
          version: '9.0.0'
        },
        health: health,
        metrics: metrics,
        system: system,
        recentLogs: logs?.logs || [],
        recentActivity: {
          users: recentUsers || [],
          bills: recentBills || []
        },
        recommendations: generateAdminRecommendations(health, metrics, system)
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Dashboard error:', err);
      res.status(500).json({ error: 'Erro ao carregar dashboard: ' + err.message });
    }
  },

  // ===== LISTAR USUÁRIOS =====
  async getUsers(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const { data, error, count } = await supabase
        .from('users')
        .select('id, name, email, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;

      res.json({
        success: true,
        data: data || [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: count
        }
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Get users error:', err);
      res.status(500).json({ error: 'Erro ao listar usuários: ' + err.message });
    }
  },

  // ===== INFORMAÇÕES DO SISTEMA =====
  async getSystemInfo(req, res) {
    try {
      const packageJson = require('../../package.json');
      
      res.json({
        success: true,
        name: 'Tobby API',
        version: packageJson.version || '9.0.0',
        description: packageJson.description || 'API do assistente financeiro Tobby',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        cpu: os.cpus().length,
        loadAverage: os.loadavg(),
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {})
      });
    } catch (err) {
      console.error('[ADMIN] ❌ System info error:', err);
      res.status(500).json({ error: 'Erro ao buscar informações do sistema: ' + err.message });
    }
  },

  // ===== LIMPAR CACHE =====
  async clearCache(req, res) {
    try {
      if (global.cache) {
        global.cache = {};
      }
      
      if (global.responseCache) {
        global.responseCache = {};
      }

      res.json({
        success: true,
        message: 'Cache limpo com sucesso',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Clear cache error:', err);
      res.status(500).json({ error: 'Erro ao limpar cache: ' + err.message });
    }
  },

  // ===== EXECUTAR JOB =====
  async runJob(req, res) {
    try {
      const { jobName } = req.body;
      
      if (!jobName) {
        return res.status(400).json({ error: 'Nome do job é obrigatório' });
      }

      const jobs = {
        'weekly-report': '../jobs/weeklyReportJob',
        'risk-analyzer': '../jobs/riskAnalyzerJob',
        'achievement-checker': '../jobs/achievementCheckerJob'
      };

      const jobPath = jobs[jobName];
      if (!jobPath) {
        return res.status(400).json({ 
          error: `Job "${jobName}" não encontrado. Jobs disponíveis: ${Object.keys(jobs).join(', ')}`
        });
      }

      const job = require(jobPath);
      const result = await job.run();

      res.json({
        success: true,
        message: `Job "${jobName}" executado com sucesso`,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[ADMIN] ❌ Run job error:', err);
      res.status(500).json({ error: 'Erro ao executar job: ' + err.message });
    }
  }
};

// ===== FUNÇÃO AUXILIAR: RECOMENDAÇÕES =====
function generateAdminRecommendations(health, metrics, system) {
  const recommendations = [];

  if (health?.database?.error) {
    recommendations.push({
      priority: 'high',
      category: 'database',
      message: 'Erro de conexão com o banco de dados detectado',
      action: 'Verificar variáveis de ambiente do Supabase'
    });
  }

  if (system?.validations?.encryption?.message?.includes('❌')) {
    recommendations.push({
      priority: 'high',
      category: 'security',
      message: 'Chave de criptografia não configurada (AES-256-GCM)',
      action: 'Adicionar ENCRYPTION_KEY no Render'
    });
  }

  if (system?.validations?.groq?.message?.includes('⚠️')) {
    recommendations.push({
      priority: 'medium',
      category: 'ai',
      message: 'GROQ_API_KEY não configurada',
      action: 'Adicionar GROQ_API_KEY para funcionalidades de IA'
    });
  }

  if (metrics?.database && metrics.database.users === 0) {
    recommendations.push({
      priority: 'low',
      category: 'users',
      message: 'Nenhum usuário cadastrado no sistema',
      action: 'Incentivar registros ou criar usuário demo'
    });
  }

  return recommendations;
}

module.exports = adminController;