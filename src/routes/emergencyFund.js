// src/routes/emergencyFund.js
const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/emergency-fund - Buscar reserva de emergência
router.get('/', async (req, res) => {
  try {
    console.log('[EMERGENCY_FUND] 💰 Buscando reserva para usuário:', req.userId);

    const { data, error } = await supabase
      .from('emergency_fund')
      .select('*')
      .eq('user_id', req.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[EMERGENCY_FUND] ❌ Erro:', error);
      return res.status(500).json({ error: 'Erro ao buscar reserva de emergência' });
    }

    // Se não tiver reserva, retorna valores padrão
    if (!data) {
      return res.json({
        current_amount: 0,
        target_months: 6,
        progress: 0
      });
    }

    // Buscar gastos mensais para calcular meses de segurança
    const { data: bills } = await supabase
      .from('bills')
      .select('value')
      .eq('user_id', req.userId)
      .eq('status', 'paid');

    const monthlyExpenses = bills?.reduce((sum, b) => sum + (b.value || 0), 0) || 0;
    const monthsOfSafety = monthlyExpenses > 0 ? data.current_amount / monthlyExpenses : 0;

    res.json({
      ...data,
      monthly_expenses: monthlyExpenses,
      months_of_safety: monthsOfSafety.toFixed(1),
      progress: Math.min(100, (data.current_amount / (monthlyExpenses * (data.target_months || 6))) * 100)
    });
  } catch (err) {
    console.error('[EMERGENCY_FUND] ❌ Erro:', err);
    res.status(500).json({ error: 'Erro ao buscar reserva de emergência: ' + err.message });
  }
});

// PUT /api/emergency-fund - Atualizar reserva de emergência
router.put('/', async (req, res) => {
  try {
    const { current_amount, target_months = 6 } = req.body;

    console.log('[EMERGENCY_FUND] ✏️ Atualizando reserva para usuário:', req.userId);

    if (current_amount === undefined || isNaN(current_amount) || current_amount < 0) {
      return res.status(400).json({ error: 'Valor atual inválido' });
    }

    const { data, error } = await supabase
      .from('emergency_fund')
      .upsert({
        user_id: req.userId,
        current_amount: parseFloat(current_amount),
        target_months: parseInt(target_months),
        updated_at: new Date()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[EMERGENCY_FUND] ❌ Erro ao atualizar:', error);
      return res.status(500).json({ error: 'Erro ao atualizar reserva de emergência' });
    }

    console.log('[EMERGENCY_FUND] ✅ Reserva atualizada com sucesso');

    res.json({
      success: true,
      data,
      message: 'Reserva de emergência atualizada com sucesso'
    });
  } catch (err) {
    console.error('[EMERGENCY_FUND] ❌ Erro:', err);
    res.status(500).json({ error: 'Erro ao atualizar reserva de emergência: ' + err.message });
  }
});

module.exports = router;