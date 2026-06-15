const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Listar todas as conquistas disponíveis
router.get('/', async (req, res) => {
  try {
    // Buscar conquistas do usuário
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', req.userId);
    
    const earnedIds = new Set(userAchievements?.map(a => a.achievement_id) || []);
    
    // Buscar todas as conquistas
    const { data: achievements, error } = await supabase
      .from('achievements')
      .select('*')
      .order('id');
    
    if (error) throw error;
    
    const achievementsWithStatus = achievements.map(ach => ({
      ...ach,
      earned: earnedIds.has(ach.id),
      earned_at: userAchievements?.find(a => a.achievement_id === ach.id)?.earned_at
    }));
    
    res.json({ achievements: achievementsWithStatus });
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'Erro ao buscar conquistas' });
  }
});

// Verificar e conceder conquistas (chamado automaticamente)
async function checkAndAwardAchievements(userId) {
  // Buscar conquistas já concedidas
  const { data: earned } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);
  
  const earnedIds = new Set(earned?.map(a => a.achievement_id) || []);
  const newAchievements = [];
  
  // 1. Primeira Conta
  if (!earnedIds.has('first_bill')) {
    const { count } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (count >= 1) {
      newAchievements.push('first_bill');
    }
  }
  
  // 2. Primeiro Investimento
  if (!earnedIds.has('first_investment')) {
    const { count } = await supabase
      .from('investments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (count >= 1) {
      newAchievements.push('first_investment');
    }
  }
  
  // 3. Reserva Iniciada
  if (!earnedIds.has('emergency_1000')) {
    const { data: fund } = await supabase
      .from('emergency_fund')
      .select('current_amount')
      .eq('user_id', userId)
      .single();
    
    if (fund && fund.current_amount >= 1000) {
      newAchievements.push('emergency_1000');
    }
  }
  
  // 4. Score 70+
  if (!earnedIds.has('score_70')) {
    const { data: score } = await supabase
      .from('financial_score')
      .select('score')
      .eq('user_id', userId)
      .single();
    
    if (score && score.score >= 70) {
      newAchievements.push('score_70');
    }
  }
  
  // 5. Score 90+
  if (!earnedIds.has('score_90')) {
    const { data: score } = await supabase
      .from('financial_score')
      .select('score')
      .eq('user_id', userId)
      .single();
    
    if (score && score.score >= 90) {
      newAchievements.push('score_90');
    }
  }
  
  // Conceder novas conquistas
  for (const achId of newAchievements) {
    const { data: ach } = await supabase
      .from('achievements')
      .select('id, name')
      .eq('requirement_type', achId)
      .single();
    
    if (ach) {
      await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: ach.id,
          earned_at: new Date()
        });
      
      // Registrar auditoria
      await supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          action: 'ACHIEVEMENT_EARNED',
          table_name: 'user_achievements',
          new_value: { achievement: ach.name }
        });
      
      console.log(`🏆 Usuário ${userId} conquistou: ${ach.name}`);
    }
  }
  
  return newAchievements;
}

module.exports = { router, checkAndAwardAchievements };