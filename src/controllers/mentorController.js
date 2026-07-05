// src/controllers/mentorController.js
const supabase = require('../db/supabase');
const aiService = require('../services/aiService');

const mentorController = {
  // ===== CRIAR PLANO DO MENTOR =====
  async createPlan(req, res) {
    try {
      const { goal, goal_type = 'custom', start_date, end_date } = req.body;

      console.log(`[MENTOR] 📝 Criando plano para usuário ${req.userId}: ${goal}`);

      if (!goal || goal.trim().length < 3) {
        return res.status(400).json({ 
          success: false, 
          error: 'Objetivo é obrigatório e deve ter pelo menos 3 caracteres' 
        });
      }

      // Verificar se já existe um plano ativo
      const { data: existing } = await supabase
        .from('mentor_plans')
        .select('id, status')
        .eq('user_id', req.userId)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ 
          success: false, 
          error: 'Você já possui um plano ativo. Conclua ou cancele o atual antes de criar um novo.' 
        });
      }

      // Gerar plano com IA
      const planData = await generateMentorPlan(goal, goal_type, req.userId);

      const { data, error } = await supabase
        .from('mentor_plans')
        .insert({
          user_id: req.userId,
          goal: goal.trim(),
          goal_type,
          start_date: start_date || new Date().toISOString().split('T')[0],
          end_date: end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_steps: planData.steps.length,
          current_step: 0,
          progress: 0,
          plan_data: planData,
          status: 'active',
          created_at: new Date()
        })
        .select()
        .single();

      if (error) {
        console.error('[MENTOR] ❌ Erro ao criar plano:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao criar plano: ' + error.message 
        });
      }

      // Registrar na memória do Tobby
      await supabase
        .from('tobby_memory')
        .insert({
          user_id: req.userId,
          memory_type: 'goal',
          memory_text: `Iniciou plano do mentor: ${goal}`,
          importance: 5,
          source: 'mentor',
          created_at: new Date()
        });

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MENTOR_PLAN_CREATED',
          table_name: 'mentor_plans',
          new_value: { 
            goal: goal.trim(),
            goal_type,
            total_steps: planData.steps.length
          }
        });

      console.log(`[MENTOR] ✅ Plano criado com sucesso para usuário ${req.userId}`);

      res.status(201).json({ 
        success: true, 
        data: { ...data, plan_data: planData },
        message: 'Plano criado com sucesso! 🎯'
      });
    } catch (err) {
      console.error('[MENTOR] ❌ Create plan error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar plano: ' + err.message 
      });
    }
  },

  // ===== OBTER PLANO ATUAL =====
  async getCurrentPlan(req, res) {
    try {
      console.log(`[MENTOR] 📖 Buscando plano atual para usuário ${req.userId}`);

      const { data, error } = await supabase
        .from('mentor_plans')
        .select('*')
        .eq('user_id', req.userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[MENTOR] ❌ Erro ao buscar plano:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar plano: ' + error.message 
        });
      }

      if (!data) {
        return res.json({ 
          success: true, 
          data: null, 
          message: 'Nenhum plano ativo encontrado. Crie um novo plano para começar sua jornada!' 
        });
      }

      // Calcular progresso baseado nos dados do plano
      const progress = data.plan_data?.steps?.length > 0 
        ? Math.round((data.current_step / data.plan_data.steps.length) * 100)
        : data.progress || 0;

      console.log(`[MENTOR] ✅ Plano atual encontrado: ${data.goal}`);

      res.json({ 
        success: true, 
        data: {
          ...data,
          progress: Math.min(100, progress)
        }
      });
    } catch (err) {
      console.error('[MENTOR] ❌ Get current plan error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar plano atual: ' + err.message 
      });
    }
  },

  // ===== ATUALIZAR PROGRESSO =====
  async updateProgress(req, res) {
    try {
      const { step, progress } = req.body;

      console.log(`[MENTOR] 📈 Atualizando progresso para usuário ${req.userId}`);

      // Buscar plano ativo
      const { data: plan, error: findError } = await supabase
        .from('mentor_plans')
        .select('*')
        .eq('user_id', req.userId)
        .eq('status', 'active')
        .single();

      if (findError || !plan) {
        return res.status(404).json({ 
          success: false, 
          error: 'Nenhum plano ativo encontrado' 
        });
      }

      const updateData = { 
        updated_at: new Date(),
        progress: progress !== undefined ? Math.min(100, Math.max(0, progress)) : plan.progress
      };

      if (step !== undefined) {
        const totalSteps = plan.plan_data?.steps?.length || 1;
        updateData.current_step = Math.min(totalSteps, Math.max(0, step));
        
        // Atualizar progresso baseado no step
        updateData.progress = Math.round((updateData.current_step / totalSteps) * 100);
      }

      // Verificar se completou
      if (updateData.progress >= 100) {
        updateData.status = 'completed';
        updateData.completed_at = new Date();
        console.log(`[MENTOR] 🎉 Plano concluído para usuário ${req.userId}`);
      }

      const { data, error } = await supabase
        .from('mentor_plans')
        .update(updateData)
        .eq('id', plan.id)
        .select()
        .single();

      if (error) {
        console.error('[MENTOR] ❌ Erro ao atualizar progresso:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao atualizar progresso: ' + error.message 
        });
      }

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MENTOR_PROGRESS_UPDATED',
          table_name: 'mentor_plans',
          new_value: { 
            progress: data.progress,
            current_step: data.current_step,
            status: data.status
          }
        });

      console.log(`[MENTOR] ✅ Progresso atualizado: ${data.progress}%`);

      // Se completou, conceder conquista
      if (data.status === 'completed') {
        await checkAndAwardAchievement(req.userId, 'mentor_completed');
      }

      res.json({ 
        success: true, 
        data,
        message: data.status === 'completed' 
          ? '🎉 Parabéns! Você concluiu seu plano do mentor!' 
          : `Progresso atualizado: ${data.progress}%`
      });
    } catch (err) {
      console.error('[MENTOR] ❌ Update progress error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar progresso: ' + err.message 
      });
    }
  },

  // ===== HISTÓRICO DE PLANOS =====
  async getPlanHistory(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      console.log(`[MENTOR] 📜 Buscando histórico de planos para usuário ${req.userId}`);

      const { data, error, count } = await supabase
        .from('mentor_plans')
        .select('*', { count: 'exact' })
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) {
        console.error('[MENTOR] ❌ Erro ao buscar histórico:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar histórico: ' + error.message 
        });
      }

      // Calcular estatísticas
      const completed = data?.filter(p => p.status === 'completed').length || 0;
      const active = data?.filter(p => p.status === 'active').length || 0;
      const abandoned = data?.filter(p => p.status === 'abandoned').length || 0;

      console.log(`[MENTOR] ✅ ${data?.length || 0} planos encontrados`);

      res.json({
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        stats: {
          total: count || 0,
          completed,
          active,
          abandoned,
          completionRate: count > 0 ? Math.round((completed / count) * 100) : 0
        }
      });
    } catch (err) {
      console.error('[MENTOR] ❌ Get history error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar histórico: ' + err.message 
      });
    }
  },

  // ===== DELETAR PLANO =====
  async deletePlan(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID do plano é obrigatório' 
        });
      }

      console.log(`[MENTOR] 🗑️ Deletando plano ${id} para usuário ${req.userId}`);

      const { data: existing } = await supabase
        .from('mentor_plans')
        .select('goal')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          error: 'Plano não encontrado' 
        });
      }

      const { error } = await supabase
        .from('mentor_plans')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) throw error;

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MENTOR_PLAN_DELETED',
          table_name: 'mentor_plans',
          old_value: { goal: existing.goal }
        });

      console.log(`[MENTOR] ✅ Plano ${id} deletado com sucesso`);

      res.json({ 
        success: true, 
        message: 'Plano deletado com sucesso' 
      });
    } catch (err) {
      console.error('[MENTOR] ❌ Delete plan error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao deletar plano: ' + err.message 
      });
    }
  },

  // ===== ESTATÍSTICAS DO MENTOR =====
  async getStats(req, res) {
    try {
      console.log(`[MENTOR] 📊 Buscando estatísticas para usuário ${req.userId}`);

      const { data, error } = await supabase
        .from('mentor_plans')
        .select('status, goal_type')
        .eq('user_id', req.userId);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        byStatus: {},
        byType: {}
      };

      (data || []).forEach(plan => {
        stats.byStatus[plan.status] = (stats.byStatus[plan.status] || 0) + 1;
        stats.byType[plan.goal_type] = (stats.byType[plan.goal_type] || 0) + 1;
      });

      // Ordenar por status
      const statusOrder = ['active', 'completed', 'abandoned'];
      const sortedStatus = {};
      statusOrder.forEach(s => {
        if (stats.byStatus[s]) sortedStatus[s] = stats.byStatus[s];
      });

      res.json({
        success: true,
        stats: {
          total: stats.total,
          byStatus: sortedStatus,
          byType: stats.byType,
          hasActivePlan: stats.byStatus.active > 0
        }
      });
    } catch (err) {
      console.error('[MENTOR] ❌ Get stats error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar estatísticas: ' + err.message 
      });
    }
  }
};

// ===== FUNÇÃO AUXILIAR: GERAR PLANO COM IA =====
async function generateMentorPlan(goal, goalType, userId) {
  // Buscar dados do usuário
  const { data: user } = await supabase
    .from('users')
    .select('salary, name')
    .eq('id', userId)
    .single();

  const salary = user?.salary || 0;
  const name = user?.name || 'Usuário';

  // Tentar gerar com IA primeiro
  try {
    const aiPlan = await aiService.generateMentorPlan({
      goal,
      goalType,
      salary,
      name,
      userId
    });

    if (aiPlan && aiPlan.steps && aiPlan.steps.length > 0) {
      return {
        goal,
        goal_type: goalType,
        steps: aiPlan.steps,
        advice: aiPlan.advice || 'Mantenha foco e disciplina!',
        created_at: new Date().toISOString(),
        generated_by: 'ai'
      };
    }
  } catch (err) {
    console.warn('[MENTOR] ⚠️ Erro ao gerar plano com IA, usando fallback:', err.message);
  }

  // Fallback: Planos baseados no tipo
  const planTemplates = {
    'debt_free': {
      steps: [
        'Liste todas as suas dívidas com valores e juros',
        'Priorize as dívidas com maiores juros',
        'Negocie com os credores para reduzir juros',
        'Corte gastos não essenciais temporariamente',
        'Destine 30% da renda para quitar dívidas',
        'Mantenha o plano por 90 dias'
      ],
      advice: `Com sua renda de R$ ${salary.toFixed(2)}, você pode destinar R$ ${(salary * 0.3).toFixed(2)} para quitar dívidas.`
    },
    'save_money': {
      steps: [
        'Defina uma meta de economia mensal realista',
        'Crie uma conta separada para economias',
        'Automatize a transferência mensal',
        'Reduza gastos com delivery e assinaturas',
        'Acompanhe seu progresso semanalmente',
        'Celebre cada conquista alcançada'
      ],
      advice: `Com sua renda de R$ ${salary.toFixed(2)}, uma meta realista é economizar ${(salary * 0.2).toFixed(2)} por mês.`
    },
    'invest': {
      steps: [
        'Monte sua reserva de emergência (3 meses de gastos)',
        'Estude sobre investimentos básicos',
        'Comece com renda fixa (Tesouro Selic)',
        'Diversifique com CDBs e LCIs',
        'Aumente os aportes gradualmente',
        'Reveja sua carteira mensalmente'
      ],
      advice: `Com sua renda de R$ ${salary.toFixed(2)}, comece investindo R$ ${(salary * 0.15).toFixed(2)} por mês.`
    },
    'emergency_fund': {
      steps: [
        'Calcule seus gastos mensais essenciais',
        'Defina meta de 6 meses de gastos',
        'Crie uma conta separada para emergências',
        'Aporte mensalmente até atingir a meta',
        'Não use para outras finalidades',
        'Comemore quando atingir a meta'
      ],
      advice: `Sua meta é acumular R$ ${(salary * 6).toFixed(2)} (6 meses de gastos).`
    },
    'custom': {
      steps: [
        'Defina sua meta financeira com clareza',
        'Crie um plano de ação detalhado',
        'Execute o plano com disciplina',
        'Monitore seu progresso regularmente',
        'Ajuste o plano quando necessário',
        'Celebre cada marco alcançado'
      ],
      advice: 'Mantenha foco e disciplina. Cada pequeno passo te aproxima do seu objetivo!'
    }
  };

  const template = planTemplates[goalType] || planTemplates['custom'];

  return {
    goal,
    goal_type: goalType,
    steps: template.steps,
    advice: template.advice || 'Mantenha foco e disciplina!',
    created_at: new Date().toISOString(),
    generated_by: 'fallback'
  };
}

// ===== FUNÇÃO AUXILIAR: CONCEDER CONQUISTA =====
async function checkAndAwardAchievement(userId, type) {
  try {
    console.log(`🏆 Verificando conquista ${type} para usuário ${userId}`);
    
    // Verificar se já tem a conquista
    const { data: existing } = await supabase
      .from('user_achievement_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_level_id', getAchievementId(type))
      .single();

    if (existing) {
      console.log(`ℹ️ Usuário ${userId} já possui a conquista ${type}`);
      return;
    }

    // Conceder conquista
    const { error } = await supabase
      .from('user_achievement_progress')
      .insert({
        user_id: userId,
        achievement_level_id: getAchievementId(type),
        progress: 100,
        is_completed: true,
        completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Erro ao conceder conquista:', error);
    } else {
      console.log(`🏆 Conquista "${type}" concedida para usuário ${userId}`);
    }
  } catch (err) {
    console.error('❌ Error awarding achievement:', err);
  }
}

function getAchievementId(type) {
  const map = {
    'mentor_completed': '6b8a7c9d-1234-5678-90ab-cdef12345679'
  };
  return map[type] || null;
}

module.exports = mentorController;