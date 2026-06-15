const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ===== MEMBROS DA FAMÍLIA =====
router.get('/members', async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at');
    
    if (error) throw error;
    res.json({ members: members || [] });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Erro ao buscar membros' });
  }
});

router.post('/members', async (req, res) => {
  try {
    const { name, email, role = 'member', can_edit = false } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    const { data, error } = await supabase
      .from('family_members')
      .insert({
        user_id: req.userId,
        name,
        email,
        role,
        can_edit
      })
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

router.delete('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Erro ao remover membro' });
  }
});

// ===== METAS COMPARTILHADAS =====
router.get('/goals', async (req, res) => {
  try {
    const { data: members } = await supabase
      .from('family_members')
      .select('id, name')
      .eq('user_id', req.userId);
    
    const memberIds = members?.map(m => m.id) || [];
    
    const { data: familyGoals, error } = await supabase
      .from('family_goals')
      .select('*, financial_goals(*)')
      .in('family_member_id', memberIds);
    
    if (error) throw error;
    
    const goalsWithMembers = (familyGoals || []).map(fg => {
      const member = members?.find(m => m.id === fg.family_member_id);
      return {
        ...fg.financial_goals,
        member_name: member?.name,
        contribution_percentage: fg.contribution_percentage
      };
    });
    
    res.json({ goals: goalsWithMembers });
  } catch (error) {
    console.error('Get family goals error:', error);
    res.status(500).json({ error: 'Erro ao buscar metas familiares' });
  }
});

router.post('/goals', async (req, res) => {
  try {
    const { member_id, goal_id, contribution_percentage = 100 } = req.body;
    
    if (!member_id || !goal_id) {
      return res.status(400).json({ error: 'Membro e meta são obrigatórios' });
    }
    
    const { data, error } = await supabase
      .from('family_goals')
      .insert({
        family_member_id: member_id,
        goal_id,
        contribution_percentage
      })
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create family goal error:', error);
    res.status(500).json({ error: 'Erro ao compartilhar meta' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { data: members } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', req.userId);
    
    const { data: familyGoals } = await supabase
      .from('family_goals')
      .select('*, financial_goals(*)')
      .in('family_member_id', members?.map(m => m.id) || []);
    
    const totalProgress = (familyGoals || []).reduce((sum, fg) => {
      const progress = (fg.financial_goals.current_amount / fg.financial_goals.target_amount) * 100;
      return sum + (progress * (fg.contribution_percentage / 100));
    }, 0);
    
    const averageProgress = (familyGoals?.length || 1) > 0 ? totalProgress / (familyGoals?.length || 1) : 0;
    
    res.json({
      total_members: members?.length || 0,
      total_shared_goals: familyGoals?.length || 0,
      average_progress: averageProgress.toFixed(1),
      members: members || []
    });
  } catch (error) {
    console.error('Family summary error:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo familiar' });
  }
});

module.exports = router;