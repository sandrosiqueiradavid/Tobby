const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    let { data: fund, error } = await supabase
      .from('emergency_fund')
      .select('*')
      .eq('user_id', req.userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    const { data: bills } = await supabase
      .from('bills')
      .select('value_encrypted')
      .eq('user_id', req.userId);
    
    const monthlyExpenses = (bills || []).reduce((sum, b) => sum + decryptNumber(b.value_encrypted), 0);
    const recommendedAmount = monthlyExpenses * (fund?.target_months || 6);
    const currentAmount = fund?.current_amount || 0;
    const progress = recommendedAmount > 0 ? (currentAmount / recommendedAmount) * 100 : 0;
    const monthsOfSafety = monthlyExpenses > 0 ? currentAmount / monthlyExpenses : 0;
    
    res.json({
      current_amount: currentAmount,
      target_months: fund?.target_months || 6,
      recommended_amount: recommendedAmount,
      monthly_expenses: monthlyExpenses,
      progress: Math.min(progress, 100),
      months_of_safety: monthsOfSafety.toFixed(1)
    });
  } catch (err) {
    console.error('Get emergency fund error:', err);
    res.status(500).json({ error: 'Erro ao buscar reserva de emergência' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { current_amount, target_months = 6 } = req.body;
    
    if (current_amount === undefined) {
      return res.status(400).json({ error: 'Valor atual é obrigatório' });
    }
    
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
    
    res.json(data);
  } catch (err) {
    console.error('Update emergency fund error:', err);
    res.status(500).json({ error: 'Erro ao atualizar reserva' });
  }
});

module.exports = router;