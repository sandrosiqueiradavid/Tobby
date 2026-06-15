const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Obter reserva de emergência
router.get('/', async (req, res) => {
  try {
    // Buscar reserva existente
    let { data: fund, error } = await supabase
      .from('emergency_fund')
      .select('*')
      .eq('user_id', req.userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    // Calcular gastos mensais do usuário
    const { data: bills } = await supabase
      .from('bills')
      .select('value_encrypted')
      .eq('user_id', req.userId);
    
    const monthlyExpenses = (bills || []).reduce((sum, b) => sum + decryptNumber(b.value_encrypted), 0);
    const recommendedAmount = monthlyExpenses * (fund?.target_months || 6);
    const currentAmount = fund?.current_amount || 0;
    const progress = recommendedAmount > 0 ? (currentAmount / recommendedAmount) * 100 : 0;
    
    // Calcular meses de segurança
    const monthsOfSafety = monthlyExpenses > 0 ? currentAmount / monthlyExpenses : 0;
    
    res.json({
      current_amount: currentAmount,
      target_months: fund?.target_months || 6,
      recommended_amount: recommendedAmount,
      monthly_expenses: monthlyExpenses,
      progress: Math.min(progress, 100),
      months_of_safety: monthsOfSafety.toFixed(1),
      status: getSafetyStatus(monthsOfSafety)
    });
  } catch (err) {
    console.error('Get emergency fund error:', err);
    res.status(500).json({ error: 'Erro ao buscar reserva de emergência' });
  }
});

// Atualizar reserva de emergência
router.put('/', async (req, res) => {
  try {
    const { current_amount, target_months = 6 } = req.body;
    
    if (current_amount === undefined) {
      return res.status(400).json({ error: 'Valor atual é obrigatório' });
    }
    
    // Buscar valor antigo para auditoria
    const { data: oldFund } = await supabase
      .from('emergency_fund')
      .select('current_amount')
      .eq('user_id', req.userId)
      .single();
    
    const { data, error } = await supabase
      .from('emergency_fund')
      .upsert({
        user_id: req.userId,
        current_amount,
        target_months,
        updated_at: new Date()
      }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    
    // Registrar auditoria
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'EMERGENCY_FUND_UPDATED',
        table_name: 'emergency_fund',
        old_value: { current_amount: oldFund?.current_amount || 0 },
        new_value: { current_amount }
      });
    
    res.json(data);
  } catch (err) {
    console.error('Update emergency fund error:', err);
    res.status(500).json({ error: 'Erro ao atualizar reserva' });
  }
});

function getSafetyStatus(months) {
  if (months >= 12) return { level: 'excellent', message: 'Excelente! Você tem mais de 1 ano de segurança! 🏆', color: '#10B981' };
  if (months >= 6) return { level: 'good', message: 'Bom! Você tem 6 meses de segurança ✅', color: '#3B82F6' };
  if (months >= 3) return { level: 'fair', message: 'OK, mas ideal é 6 meses ⚠️', color: '#F59E0B' };
  if (months > 0) return { level: 'poor', message: 'Atenção! Sua reserva está baixa 🔴', color: '#EF4444' };
  return { level: 'none', message: 'Comece a construir sua reserva de emergência! 🐶', color: '#6B7280' };
}

module.exports = router;