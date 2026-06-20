const supabase = require('../db/supabase');

const achievementsController = {
  // ===== LISTAR TODAS AS CONQUISTAS =====
  async getAllAchievements(req, res) {
    try {
      const { data: levels, error } = await supabase
        .from('achievement_levels')
        .select('*')
        .order('points', { ascending: true });

      if (error) throw error;

      // Buscar progresso do usuário
      const { data: progress } = await supabase
        .from('user_achievement_progress')
        .select('*')
        .eq('user_id', req.userId);

      const progressMap = {};
      (progress || []).forEach(p => {
        progressMap[p.achievement_level_id] = p;
      });

      const achievementsWithProgress = (levels || []).map(level => ({
        ...level,
        progress: progressMap[level.id]?.progress || 0,
        is_completed: progressMap[level.id]?.is_completed || false,
        completed_at: progressMap[level.id]?.completed_at || null
      }));

      res.json({ success: true, data: achievementsWithProgress });
    } catch (err) {
      console.error('Get achievements error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== VERIFICAR E ATUALIZAR CONQUISTAS =====
  async checkAchievements(req, res) {
    try {
      const userId = req.userId;
      const results = await checkAllAchievements(userId);
      res.json({ success: true, data: results });
    } catch (err) {
      console.error('Check achievements error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== OBTER PROGRESSO DO USUÁRIO =====
  async getUserProgress(req, res) {
    try {
      const { data: progress, error } = await supabase
        .from('user_achievement_progress')
        .select('*, achievement_levels(*)')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const completed = (progress || []).filter(p => p.is_completed);
      const totalPoints = completed.reduce((sum, p) => sum + (p.achievement_levels?.points || 0), 0);

      res.json({
        success: true,
        data: {
          total: progress?.length || 0,
          completed: completed.length,
          totalPoints,
          progress: progress || []
        }
      });
    } catch (err) {
      console.error('User progress error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// ===== FUNÇÃO: VERIFICAR TODAS AS CONQUISTAS =====
async function checkAllAchievements(userId) {
  const results = [];
  
  // Buscar todas as conquistas
  const { data: levels } = await supabase
    .from('achievement_levels')
    .select('*');

  if (!levels) return results;

  // Buscar dados do usuário
  const { data: user } = await supabase
    .from('users')
    .select('salary, created_at')
    .eq('id', userId)
    .single();

  const { data: bills } = await supabase
    .from('bills')
    .select('value_encrypted, status')
    .eq('user_id', userId);

  const { data: investments } = await supabase
    .from('investments')
    .select('quantity, purchase_price_encrypted')
    .eq('user_id', userId);

  const { data: goals } = await supabase
    .from('financial_goals')
    .select('current_amount, target_amount, status')
    .eq('user_id', userId)
    .eq('status', 'completed');

  const { data: emergency } = await supabase
    .from('emergency_fund')
    .select('current_amount')
    .eq('user_id', userId)
    .single();

  const { data: score } = await supabase
    .from('financial_score')
    .select('score')
    .eq('user_id', userId)
    .single();

  const { data: assets } = await supabase
    .from('assets')
    .select('estimated_value_encrypted')
    .eq('user_id', userId);

  // Calcular métricas
  const totalBills = bills?.length || 0;
  const paidBills = bills?.filter(b => b.status === 'paid').length || 0;
  const totalInvestments = investments?.length || 0;
  const completedGoals = goals?.length || 0;
  const emergencyAmount = emergency?.current_amount || 0;
  const userScore = score?.score || 0;
  
  let totalAssets = 0;
  if (assets) {
    totalAssets = assets.reduce((sum, a) => {
      // Simulação de decriptografia
      return sum + (parseFloat(a.estimated_value_encrypted) || 0);
    }, 0);
  }

  const salary = user?.salary || 0;
  const monthsSinceCreation = user?.created_at 
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0;

  // Verificar cada conquista
  for (const level of levels) {
    let shouldUpdate = false;
    let progress = 0;
    let isCompleted = false;

    switch (level.name) {
      case 'Primeira Conta':
        progress = totalBills > 0 ? 100 : 0;
        isCompleted = totalBills > 0;
        break;
      case 'Mês sem Atraso':
        progress = paidBills === totalBills && totalBills > 0 ? 100 : 0;
        isCompleted = paidBills === totalBills && totalBills > 0;
        break;
      case 'Reserva Iniciada':
        progress = Math.min((emergencyAmount / 1000) * 100, 100);
        isCompleted = emergencyAmount >= 1000;
        break;
      case 'Investidor Iniciante':
        progress = totalInvestments > 0 ? 100 : 0;
        isCompleted = totalInvestments > 0;
        break;
      case 'Meta Alcançada':
        progress = Math.min(completedGoals * 25, 100);
        isCompleted = completedGoals >= 1;
        break;
      case 'Reserva 3 Meses':
        const threeMonths = salary * 3;
        progress = Math.min((emergencyAmount / threeMonths) * 100, 100);
        isCompleted = emergencyAmount >= threeMonths;
        break;
      case 'Score 70+':
        progress = Math.min((userScore / 70) * 100, 100);
        isCompleted = userScore >= 70;
        break;
      case 'Investidor Regular':
        progress = Math.min((monthsSinceCreation / 6) * 100, 100);
        isCompleted = monthsSinceCreation >= 6 && totalInvestments > 0;
        break;
      case 'Reserva 6 Meses':
        const sixMonths = salary * 6;
        progress = Math.min((emergencyAmount / sixMonths) * 100, 100);
        isCompleted = emergencyAmount >= sixMonths;
        break;
      case 'Score 90+':
        progress = Math.min((userScore / 90) * 100, 100);
        isCompleted = userScore >= 90;
        break;
      case 'Patrimônio 100k':
        progress = Math.min((totalAssets / 100000) * 100, 100);
        isCompleted = totalAssets >= 100000;
        break;
      case 'Patrimônio 500k':
        progress = Math.min((totalAssets / 500000) * 100, 100);
        isCompleted = totalAssets >= 500000;
        break;
    }

    if (isCompleted) {
      // Verificar se já foi completada
      const { data: existing } = await supabase
        .from('user_achievement_progress')
        .select('id, is_completed')
        .eq('user_id', userId)
        .eq('achievement_level_id', level.id)
        .single();

      if (!existing || !existing.is_completed) {
        // Atualizar ou inserir
        await supabase
          .from('user_achievement_progress')
          .upsert({
            user_id: userId,
            achievement_level_id: level.id,
            progress: 100,
            is_completed: true,
            completed_at: new Date(),
            updated_at: new Date()
          }, { onConflict: 'user_id,achievement_level_id' });

        results.push({ achievement: level.name, status: 'completed' });
      }
    } else if (progress > 0) {
      // Atualizar progresso
      await supabase
        .from('user_achievement_progress')
        .upsert({
          user_id: userId,
          achievement_level_id: level.id,
          progress,
          is_completed: false,
          updated_at: new Date()
        }, { onConflict: 'user_id,achievement_level_id' });
    }
  }

  return results;
}

module.exports = achievementsController;