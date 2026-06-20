const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');
const AIService = require('../services/aiService');
const aiService = new AIService();

const briefingController = {
  // ===== OBTER BRIEFING MATINAL =====
  async getMorningBriefing(req, res) {
    try {
      // Buscar dados do usuário
      const { data: user } = await supabase
        .from('users')
        .select('name, salary, salary_encrypted')
        .eq('id', req.userId)
        .single();

      const salary = decryptNumber(user?.salary_encrypted) || user?.salary || 0;

      // Buscar contas da semana
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);

      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', req.userId)
        .gte('due_day', today.getDate())
        .lte('due_day', endOfWeek.getDate());

      // Buscar score
      const { data: score } = await supabase
        .from('financial_score')
        .select('score')
        .eq('user_id', req.userId)
        .single();

      // Buscar metas
      const { data: goals } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', req.userId)
        .eq('status', 'active');

      // Buscar alertas não lidos
      const { data: alerts } = await supabase
        .from('behavior_alerts')
        .select('*')
        .eq('user_id', req.userId)
        .eq('is_read', false);

      // Buscar missões da semana
      const weekStart = getWeekStart();
      const { data: missions } = await supabase
        .from('weekly_missions')
        .select('*')
        .eq('user_id', req.userId)
        .eq('week_start', weekStart);

      // Gerar briefing personalizado
      const briefing = await generateBriefing(user, {
        salary,
        dueBills: bills?.length || 0,
        score: score?.score || 0,
        goals: goals || [],
        alerts: alerts?.length || 0,
        missions: missions || []
      });

      // Registrar briefing
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MORNING_BRIEFING',
          table_name: 'daily_briefing'
        });

      res.json({
        success: true,
        data: {
          briefing,
          stats: {
            salary,
            dueBills: bills?.length || 0,
            score: score?.score || 0,
            activeGoals: goals?.length || 0,
            unreadAlerts: alerts?.length || 0,
            pendingMissions: missions?.filter(m => m.status !== 'completed').length || 0
          }
        }
      });
    } catch (err) {
      console.error('Morning briefing error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

async function generateBriefing(user, data) {
  const { salary, dueBills, score, goals, alerts, missions } = data;
  const name = user?.name || 'Usuário';

  // Gerar mensagem personalizada
  let message = `🐶 Bom dia, ${name}!`;

  // Contas a vencer
  if (dueBills > 0) {
    message += `\n\n📋 Você tem ${dueBills} conta(s) vencendo nesta semana. Programe-se!`;
  } else {
    message += `\n\n✅ Nenhuma conta a vencer esta semana. Respire aliviado!`;
  }

  // Score
  if (score >= 70) {
    message += `\n\n🏆 Seu score financeiro está em ${score}/100. Excelente trabalho! Continue assim.`;
  } else if (score >= 50) {
    message += `\n\n📊 Seu score financeiro está em ${score}/100. Há espaço para melhorias, vamos juntos!`;
  } else {
    message += `\n\n⚠️ Seu score financeiro está em ${score}/100. Vamos focar em melhorar isso hoje!`;
  }

  // Metas
  if (goals.length > 0) {
    const closestGoal = goals[0];
    const progress = (closestGoal.current_amount / closestGoal.target_amount) * 100;
    message += `\n\n🎯 Sua meta "${closestGoal.name}" está ${progress.toFixed(0)}% concluída. Continue firme!`;
  }

  // Missões
  const pendingMissions = missions?.filter(m => m.status !== 'completed') || [];
  if (pendingMissions.length > 0) {
    message += `\n\n📌 Você tem ${pendingMissions.length} missão(ões) pendentes para esta semana.`;
  }

  // Alertas
  if (alerts > 0) {
    message += `\n\n🔔 Você tem ${alerts} alerta(s) não lidos. Verifique-os!`;
  }

  // Dica do dia
  const tips = [
    "💡 Dica: Separe 20% do seu salário para investimentos",
    "💡 Dica: Revise suas assinaturas mensais",
    "💡 Dica: Planeje suas compras da semana",
    "💡 Dica: Um pequeno gesto hoje faz grande diferença amanhã"
  ];
  message += `\n\n${tips[Math.floor(Math.random() * tips.length)]}`;

  message += `\n\n🐶 Tenha um ótimo dia! Estou aqui para ajudar.`;

  return message;
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

module.exports = briefingController;