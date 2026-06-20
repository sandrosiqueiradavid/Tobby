const supabase = require('../db/supabase');
const aiService = require('../services/aiService');

const mentorController = {
  // ===== CRIAR PLANO DO MENTOR =====
  async createPlan(req, res) {
    try {
      const { goal, goal_type = 'custom', start_date, end_date } = req.body;

      if (!goal) {
        return res.status(400).json({ error: 'Objetivo é obrigatório' });
      }

      // Gerar plano com IA
      const planData = await generateMentorPlan(goal, goal_type, req.userId);

      const { data, error } = await supabase
        .from('mentor_plans')
        .insert({
          user_id: req.userId,
          goal,
          goal_type,
          start_date: start_date || new Date().toISOString().split('T')[0],
          end_date: end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_steps: planData.steps.length,
          plan_data: planData,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar na memória
      await supabase
        .from('tobby_memory')
        .insert({
          user_id: req.userId,
          memory_type: 'goal',
          memory_text: `Iniciou plano do mentor: ${goal}`,
          importance: 5,
          source: 'mentor'
        });

      res.status(201).json({ success: true, data: { ...data, plan_data: planData } });
    } catch (err) {
      console.error('Create mentor plan error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== OBTER PLANO ATUAL =====
  async getCurrentPlan(req, res) {
    try {
      const { data, error } = await supabase
        .from('mentor_plans')
        .select('*')
        .eq('user_id', req.userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return res.json({ success: true, data: null, message: 'Nenhum plano ativo' });
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error('Get mentor plan error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== ATUALIZAR PROGRESSO =====
  async updateProgress(req, res) {
    try {
      const { step, progress } = req.body;

      const { data: plan, error: findError } = await supabase
        .from('mentor_plans')
        .select('*')
        .eq('user_id', req.userId)
        .eq('status', 'active')
        .single();

      if (findError || !plan) {
        return res.status(404).json({ error: 'Nenhum plano ativo encontrado' });
      }

      const updateData = { updated_at: new Date() };
      if (step !== undefined) updateData.current_step = step;
      if (progress !== undefined) updateData.progress = progress;

      const { data, error } = await supabase
        .from('mentor_plans')
        .update(updateData)
        .eq('id', plan.id)
        .select()
        .single();

      if (error) throw error;

      // Verificar se completou
      if (data.progress >= 100) {
        await supabase
          .from('mentor_plans')
          .update({ status: 'completed' })
          .eq('id', plan.id);
        
        await checkAndAwardAchievement(req.userId, 'mentor_completed');
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error('Update mentor progress error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== HISTÓRICO DE PLANOS =====
  async getPlanHistory(req, res) {
    try {
      const { data, error } = await supabase
        .from('mentor_plans')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('Mentor history error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// ===== FUNÇÃO AUXILIAR: GERAR PLANO COM IA =====
async function generateMentorPlan(goal, goalType, userId) {
  // Buscar dados do usuário
  const { data: user } = await supabase
    .from('users')
    .select('salary')
    .eq('id', userId)
    .single();

  const salary = user?.salary || 0;

  // Planos baseados no tipo
  const planTemplates = {
    'debt_free': {
      steps: [
        'Liste todas as suas dívidas com valores e juros',
        'Priorize as dívidas com maiores juros',
        'Negocie com os credores',
        'Corte gastos não essenciais',
        'Destine 30% da renda para quitar dívidas',
        'Mantenha o plano por 90 dias'
      ],
      advice: `Com sua renda de R$ ${salary.toFixed(2)}, você pode destinar R$ ${(salary * 0.3).toFixed(2)} para quitar dívidas.`
    },
    'save_money': {
      steps: [
        'Defina uma meta de economia mensal',
        'Crie uma conta separada para economias',
        'Automatize a transferência mensal',
        'Reduza gastos com delivery e assinaturas',
        'Acompanhe seu progresso semanalmente',
        'Celebre cada conquista'
      ],
      advice: `Com sua renda de R$ ${salary.toFixed(2)}, uma meta realista é economizar ${(salary * 0.2).toFixed(2)} por mês.`
    },
    'invest': {
      steps: [
        'Monte sua reserva de emergência (3 meses de gastos)',
        'Estude sobre investimentos',
        'Comece com renda fixa (Tesouro Selic)',
        'Diversifique com CDBs e LCIs',
        'Aumente aportes gradualmente',
        'Reveja sua carteira mensalmente'
      ],
      advice: `Com sua renda de R$ ${salary.toFixed(2)}, comece investindo R$ ${(salary * 0.15).toFixed(2)} por mês.`
    },
    'emergency_fund': {
      steps: [
        'Calcule seus gastos mensais',
        'Defina meta de 6 meses de gastos',
        'Crie uma conta separada para emergências',
        'Aporte mensalmente até atingir a meta',
        'Não use para outras finalidades',
        'Comemore quando atingir a meta'
      ],
      advice: `Sua meta é acumular R$ ${(salary * 6).toFixed(2)} (6 meses de gastos).`
    }
  };

  const template = planTemplates[goalType] || planTemplates['custom'];

  return {
    goal,
    goal_type: goalType,
    steps: template.steps,
    advice: template.advice || 'Mantenha foco e disciplina!',
    created_at: new Date().toISOString()
  };
}

async function checkAndAwardAchievement(userId, type) {
  console.log(`🏆 Conquista ${type} para usuário ${userId}`);
}

module.exports = mentorController;