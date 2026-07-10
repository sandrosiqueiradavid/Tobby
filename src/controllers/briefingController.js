// src/controllers/briefingController.js
const supabase = require('../db/supabase');
const { decryptNumber } = require('../services/encryptionService');
const AIService = require('../services/aiService');
const aiService = new AIService();

const briefingController = {
  // ===== OBTER BRIEFING MATINAL =====
  async getMorningBriefing(req, res) {
    try {
      console.log('[BRIEFING] 🌅 Gerando briefing matinal para:', req.userId);
      
      // Buscar dados do usuário
      const { data: user } = await supabase
        .from('users')
        .select('name, salary, salary_encrypted, created_at')
        .eq('id', req.userId)
        .single();

      const salary = decryptNumber(user?.salary_encrypted) || user?.salary || 0;
      const daysSinceCreation = user?.created_at 
        ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      // Buscar contas da semana
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);

      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', req.userId);

      // Buscar contas da semana
      const weeklyBills = bills?.filter(b => {
        const dueDate = new Date(today);
        dueDate.setDate(b.due_day);
        return dueDate >= today && dueDate <= endOfWeek;
      }) || [];

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

      // Buscar contas atrasadas
      const lateBills = bills?.filter(b => 
        b.status === 'late' || (b.status === 'pending' && b.due_day < new Date().getDate())
      ) || [];

      // Buscar reserva de emergência
      const { data: emergency } = await supabase
        .from('emergency_fund')
        .select('current_amount')
        .eq('user_id', req.userId)
        .single();

      // Gerar briefing personalizado
      const briefing = await generateBriefing(user, {
        salary,
        totalBills: bills?.length || 0,
        dueBills: weeklyBills.length,
        lateBills: lateBills.length,
        score: score?.score || 0,
        goals: goals || [],
        alerts: alerts?.length || 0,
        missions: missions || [],
        emergencyFund: emergency?.current_amount || 0,
        daysSinceCreation,
        pendingMissions: missions?.filter(m => m.status !== 'completed').length || 0,
        completedMissions: missions?.filter(m => m.status === 'completed').length || 0
      });

      // Registrar briefing no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MORNING_BRIEFING',
          table_name: 'daily_briefing',
          new_value: { 
            date: new Date().toISOString(),
            score: score?.score || 0,
            dueBills: weeklyBills.length
          }
        });

      res.json({
        success: true,
        data: {
          briefing,
          stats: {
            salary,
            dueBills: weeklyBills.length,
            lateBills: lateBills.length,
            score: score?.score || 0,
            activeGoals: goals?.length || 0,
            unreadAlerts: alerts?.length || 0,
            pendingMissions: missions?.filter(m => m.status !== 'completed').length || 0,
            completedMissions: missions?.filter(m => m.status === 'completed').length || 0,
            emergencyFund: emergency?.current_amount || 0,
            daysSinceCreation
          }
        }
      });
    } catch (err) {
      console.error('Morning briefing error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== OBTER BRIEFING PERSONALIZADO (VIA IA) =====
  async getAIBriefing(req, res) {
    try {
      console.log('[BRIEFING] 🤖 Gerando briefing com IA para:', req.userId);
      
      // Buscar dados do usuário
      const { data: user } = await supabase
        .from('users')
        .select('name, salary, salary_encrypted')
        .eq('id', req.userId)
        .single();

      const salary = decryptNumber(user?.salary_encrypted) || user?.salary || 0;

      // Buscar dados financeiros resumidos
      const { data: bills } = await supabase
        .from('bills')
        .select('value_encrypted, status, due_day')
        .eq('user_id', req.userId);

      const billsWithValues = (bills || []).map(b => ({
        ...b,
        value: decryptNumber(b.value_encrypted) || 0
      }));

      const totalExpenses = billsWithValues.reduce((s, b) => s + b.value, 0);
      const pendingBills = billsWithValues.filter(b => b.status === 'pending').length;
      const lateBills = billsWithValues.filter(b => b.status === 'late').length;

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

      const goalsData = goals?.map(g => ({
        name: g.name,
        progress: g.target_amount > 0 ? (g.current_amount / g.target_amount * 100).toFixed(0) + '%' : '0%'
      })) || [];

      // Gerar briefing com IA
      const aiBriefing = await aiService.generateBriefing({
        name: user?.name || 'Usuário',
        salary,
        totalExpenses,
        pendingBills,
        lateBills,
        score: score?.score || 0,
        goals: goalsData,
        goalCount: goals?.length || 0
      });

      res.json({
        success: true,
        data: {
          briefing: aiBriefing,
          stats: {
            salary,
            totalExpenses,
            pendingBills,
            lateBills,
            score: score?.score || 0,
            activeGoals: goals?.length || 0
          }
        }
      });
    } catch (err) {
      console.error('AI Briefing error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// ===== FUNÇÃO AUXILIAR: GERAR BRIEFING COM SAUDAÇÃO POR HORÁRIO =====
async function generateBriefing(user, data) {
  const { 
    salary, 
    dueBills, 
    lateBills,
    score, 
    goals, 
    alerts, 
    missions, 
    emergencyFund,
    daysSinceCreation,
    pendingMissions,
    completedMissions
  } = data;
  
  const name = user?.name || 'Usuário';

  // ============================================
  // SAUDAÇÃO BASEADA NO HORÁRIO
  // ============================================
  const hour = new Date().getHours();
  let greeting = '';
  let emoji = '';
  
  if (hour >= 6 && hour < 12) {
    greeting = 'Bom dia';
    emoji = '🌅';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Boa tarde';
    emoji = '☀️';
  } else if (hour >= 18 && hour < 24) {
    greeting = 'Boa noite';
    emoji = '🌙';
  } else {
    greeting = 'Boa madrugada';
    emoji = '🌃';
  }

  // ============================================
  // MENSAGEM PRINCIPAL COM SAUDAÇÃO CORRETA
  // ============================================
  let message = `🐶 ${greeting}, ${name}! ${emoji}`;

  // Contas a vencer
  if (dueBills > 0) {
    message += `\n\n📋 Você tem ${dueBills} conta(s) vencendo esta semana. Programe-se para não esquecer!`;
  } else {
    message += `\n\n✅ Nenhuma conta a vencer esta semana. Respire aliviado!`;
  }

  // Contas atrasadas
  if (lateBills > 0) {
    message += `\n\n⚠️ Atenção! Você tem ${lateBills} conta(s) atrasada(s). Vamos resolver isso juntos?`;
  }

  // Score
  if (score >= 70) {
    message += `\n\n🏆 Seu score financeiro está em ${score}/100. Excelente trabalho! Continue assim.`;
  } else if (score >= 50) {
    message += `\n\n📊 Seu score financeiro está em ${score}/100. Há espaço para melhorias, vamos juntos!`;
  } else if (score >= 30) {
    message += `\n\n⚠️ Seu score financeiro está em ${score}/100. Vamos focar em melhorar isso hoje!`;
  } else {
    message += `\n\n🔴 Seu score financeiro está em ${score}/100. Precisamos de atenção urgente!`;
  }

  // Metas
  if (goals && goals.length > 0) {
    const closestGoal = goals[0];
    const progress = closestGoal.target_amount > 0 
      ? (closestGoal.current_amount / closestGoal.target_amount * 100) 
      : 0;
    message += `\n\n🎯 Sua meta "${closestGoal.name}" está ${progress.toFixed(0)}% concluída. Continue firme!`;
  } else {
    message += `\n\n🎯 Que tal criar uma meta financeira hoje? Posso te ajudar!`;
  }

  // Missões
  if (pendingMissions > 0) {
    message += `\n\n📌 Você tem ${pendingMissions} missão(ões) pendentes para esta semana.`;
  }
  if (completedMissions > 0) {
    message += `\n\n🏅 Parabéns! Você já completou ${completedMissions} missão(ões) esta semana! 🎉`;
  }

  // Reserva de emergência
  if (emergencyFund > 0) {
    const monthsOfSafety = salary > 0 ? emergencyFund / salary : 0;
    if (monthsOfSafety >= 6) {
      message += `\n\n🏦 Sua reserva de emergência (R$ ${emergencyFund.toFixed(2)}) já cobre ${monthsOfSafety.toFixed(1)} meses de salário. Excelente!`;
    } else if (monthsOfSafety >= 3) {
      message += `\n\n🏦 Sua reserva de emergência (R$ ${emergencyFund.toFixed(2)}) cobre ${monthsOfSafety.toFixed(1)} meses. Continue construindo!`;
    } else {
      message += `\n\n🏦 Sua reserva de emergência (R$ ${emergencyFund.toFixed(2)}) está abaixo do ideal. Vamos focar nisso!`;
    }
  }

  // Alertas
  if (alerts > 0) {
    message += `\n\n🔔 Você tem ${alerts} alerta(s) não lidos. Verifique-os para não perder nada importante!`;
  }

  // Mensagem de boas-vindas para novos usuários
  if (daysSinceCreation < 7) {
    message += `\n\n🐶 Bem-vindo(a) ao Tobby! Estou muito feliz em te ajudar a organizar suas finanças!`;
  }

  // Dica do dia (personalizada baseada nos dados)
  let tip = getPersonalizedTip(salary, dueBills, lateBills, score, goals);
  message += `\n\n💡 ${tip}`;

  // ============================================
  // DESPEDIDA ADAPTADA AO HORÁRIO
  // ============================================
  let farewell = '';
  if (hour >= 6 && hour < 12) {
    farewell = 'Tenha um ótimo dia!';
  } else if (hour >= 12 && hour < 18) {
    farewell = 'Tenha uma ótima tarde!';
  } else if (hour >= 18 && hour < 24) {
    farewell = 'Tenha uma ótima noite!';
  } else {
    farewell = 'Tenha uma boa madrugada!';
  }
  
  message += `\n\n🐶 ${farewell} Estou aqui para ajudar.`;

  return message;
}

// ===== FUNÇÃO AUXILIAR: DICA PERSONALIZADA =====
function getPersonalizedTip(salary, dueBills, lateBills, score, goals) {
  const tips = [
    "Separe 20% do seu salário para investimentos assim que receber",
    "Revise suas assinaturas mensais - você pode estar pagando por serviços que não usa",
    "Planeje suas compras da semana para evitar gastos por impulso",
    "Um pequeno gesto hoje faz grande diferença amanhã. Comece com R$ 10 por dia",
    "Acompanhe seus gastos diários - o que é medido pode ser melhorado"
  ];

  // Personalizar dica baseada na situação
  if (lateBills > 0) {
    return "Priorize o pagamento das contas atrasadas para evitar juros. Negocie com os credores se necessário.";
  }
  
  if (dueBills > 0 && salary > 0) {
    const totalDue = dueBills * 100; // Estimativa
    if (totalDue > salary * 0.3) {
      return "Suas contas da semana representam mais de 30% do seu salário. Tente negociar prazos ou parcelamentos.";
    }
  }

  if (score < 50) {
    return "Foque em pagar contas em dia e reduzir dívidas para melhorar seu score financeiro.";
  }

  if (goals && goals.length === 0) {
    return "Defina uma meta financeira hoje! Pode ser pequena, mas vai te motivar a economizar.";
  }

  return tips[Math.floor(Math.random() * tips.length)];
}

// ===== FUNÇÃO AUXILIAR: INÍCIO DA SEMANA =====
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

module.exports = briefingController;