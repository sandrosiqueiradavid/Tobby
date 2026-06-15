const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Criar meta
router.post('/goals', async (req, res) => {
  try {
    const { name, target_amount, current_amount = 0, deadline } = req.body;
    
    if (!name || !target_amount || !deadline) {
      return res.status(400).json({ error: 'Nome, valor alvo e prazo são obrigatórios' });
    }
    
    const { data, error } = await supabase
      .from('financial_goals')
      .insert({
        user_id: req.userId,
        name,
        target_amount,
        current_amount,
        deadline,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Registrar auditoria
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'GOAL_CREATED',
        table_name: 'financial_goals',
        new_value: { name, target_amount, deadline }
      });
    
    res.status(201).json(data);
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

// Listar metas do usuário
router.get('/goals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Calcular progresso para cada meta
    const goalsWithProgress = (data || []).map(goal => ({
      ...goal,
      progress: (goal.current_amount / goal.target_amount) * 100,
      remaining: goal.target_amount - goal.current_amount,
      monthly_needed: calculateMonthlyNeeded(goal.current_amount, goal.target_amount, goal.deadline)
    }));
    
    res.json({ goals: goalsWithProgress });
  } catch (err) {
    console.error('Get goals error:', err);
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

// Atualizar valor atual da meta
router.put('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { current_amount } = req.body;
    
    // Buscar meta atual
    const { data: oldGoal, error: findError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();
    
    if (findError) return res.status(404).json({ error: 'Meta não encontrada' });
    
    const newProgress = (current_amount / oldGoal.target_amount) * 100;
    const status = newProgress >= 100 ? 'completed' : 'active';
    
    const { data, error } = await supabase
      .from('financial_goals')
      .update({ 
        current_amount, 
        status,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Registrar auditoria
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'GOAL_UPDATED',
        table_name: 'financial_goals',
        old_value: { current_amount: oldGoal.current_amount },
        new_value: { current_amount }
      });
    
    // Se completou a meta, registrar conquista
    if (status === 'completed' && oldGoal.status !== 'completed') {
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'GOAL_COMPLETED',
          table_name: 'financial_goals',
          new_value: { name: oldGoal.name, target_amount: oldGoal.target_amount }
        });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

// Deletar meta
router.delete('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);
    
    if (error) throw error;
    
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'GOAL_DELETED',
        table_name: 'financial_goals'
      });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ error: 'Erro ao deletar meta' });
  }
});

function calculateMonthlyNeeded(current, target, deadline) {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const monthsLeft = (deadlineDate.getFullYear() - today.getFullYear()) * 12 + 
                     (deadlineDate.getMonth() - today.getMonth());
  
  if (monthsLeft <= 0) return 0;
  
  const remaining = target - current;
  return remaining / monthsLeft;
}

module.exports = router;