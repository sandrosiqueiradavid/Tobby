const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Listar todas as conquistas disponíveis
router.get('/', async (req, res) => {
  try {
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', req.userId);
    
    const earnedIds = new Set(userAchievements?.map(a => a.achievement_id) || []);
    
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

// Função auxiliar para verificar e conceder conquistas (NÃO é rota)
async function checkAndAwardAchievements(userId) {
  try {
    const { data: earned } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);
    
    const earnedIds = new Set(earned?.map(a => a.achievement_id) || []);
    const newAchievements = [];
    
    // Verificar conquistas
    if (!earnedIds.has('first_bill')) {
      const { count } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (count >= 1) {
        newAchievements.push('first_bill');
      }
    }
    
    if (!earnedIds.has('first_investment')) {
      const { count } = await supabase
        .from('investments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (count >= 1) {
        newAchievements.push('first_investment');
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
        
        console.log(`🏆 Usuário ${userId} conquistou: ${ach.name}`);
      }
    }
    
    return newAchievements;
  } catch (err) {
    console.error('Erro ao verificar conquistas:', err);
    return [];
  }
}

// Exportar APENAS o router (NÃO um objeto)
module.exports = router;