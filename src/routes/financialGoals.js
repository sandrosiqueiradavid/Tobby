// src/routes/financialGoals.js
const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ============================================
// METAS FINANCEIRAS - ROTAS CORRIGIDAS
// ============================================

// GET /api/financial-goals - Listar todas as metas
router.get('/', async (req, res) => {
  try {
    console.log('[FINANCIAL_GOALS] 📋 Listando metas para usuário:', req.userId);

    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FINANCIAL_GOALS] ❌ Erro:', error);
      return res.status(500).json({ error: 'Erro ao buscar metas' });
    }

    // Calcular progresso para cada meta
    const goalsWithProgress = (data || []).map(goal => ({
      ...goal,
      progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
      remaining: goal.target_amount - goal.current_amount,
      monthly_needed: calculateMonthlyNeeded(goal.current_amount, goal.target_amount, goal.deadline)
    }));

    console.log(`[FINANCIAL_GOALS] ✅ ${goalsWithProgress.length} metas encontradas`);

    res.json({ goals: goalsWithProgress });
  } catch (err) {
    console.error('[FINANCIAL_GOALS] ❌ Erro:', err);
    res.status(500).json({ error: 'Erro ao buscar metas: ' + err.message });
  }
});

// POST /api/financial-goals - Criar nova meta
router.post('/', async (req, res) => {
  try {
    const { name, target_amount, current_amount = 0, deadline } = req.body;

    console.log('[FINANCIAL_GOALS] ➕ Criando meta para usuário:', req.userId);

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

    if (error) {
      console.error('[FINANCIAL_GOALS] ❌ Erro ao criar:', error);
      return res.status(500).json({ error: 'Erro ao criar meta: ' + error.message });
    }

    // Registrar auditoria
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'GOAL_CREATED',
        table_name: 'financial_goals',
        new_value: { name, target_amount, deadline }
      });

    console.log('[FINANCIAL_GOALS] ✅ Meta criada com sucesso:', data.id);

    res.status(201).json(data);
  } catch (err) {
    console.error('[FINANCIAL_GOALS] ❌ Erro:', err);
    res.status(500).json({ error: 'Erro ao criar meta: ' + err.message });
  }
});

// PUT /api/financial-goals/:id - Atualizar meta
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { current_amount } = req.body;

    console.log(`[FINANCIAL_GOALS] ✏️ Atualizando meta ${id}`);

    if (current_amount === undefined) {
      return res.status(400).json({ error: 'Valor atual é obrigatório' });
    }

    // Buscar meta atual
    const { data: oldGoal, error: findError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (findError) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

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

    if (error) {
      console.error('[FINANCIAL_GOALS] ❌ Erro ao atualizar:', error);
      return res.status(500).json({ error: 'Erro ao atualizar meta: ' + error.message });
    }

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
      console.log(`[FINANCIAL_GOALS] 🏆 Meta "${oldGoal.name}" concluída!`);
    }

    console.log('[FINANCIAL_GOALS] ✅ Meta atualizada com sucesso');

    res.json(data);
  } catch (err) {
    console.error('[FINANCIAL_GOALS] ❌ Erro:', err);
    res.status(500).json({ error: 'Erro ao atualizar meta: ' + err.message });
  }
});

// DELETE /api/financial-goals/:id - Deletar meta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[FINANCIAL_GOALS] 🗑️ Deletando meta ${id}`);

    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) {
      console.error('[FINANCIAL_GOALS] ❌ Erro ao deletar:', error);
      return res.status(500).json({ error: 'Erro ao deletar meta: ' + error.message });
    }

    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'GOAL_DELETED',
        table_name: 'financial_goals'
      });

    console.log('[FINANCIAL_GOALS] ✅ Meta deletada com sucesso');

    res.json({ success: true });
  } catch (err) {
    console.error('[FINANCIAL_GOALS] ❌ Erro:', err);
    res.status(500).json({ error: 'Erro ao deletar meta: ' + err.message });
  }
});

// ============================================
// FUNÇÃO AUXILIAR
// ============================================

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