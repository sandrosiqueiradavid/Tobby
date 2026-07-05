// src/routes/financialScore.js
const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { decryptNumber } = require('../services/encryptionService');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

async function calculateFinancialScore(userId) {
  try {
    // Buscar dados do usuário
    const { data: user } = await supabase
      .from('users')
      .select('salary_encrypted')
      .eq('id', userId)
      .single();
    
    const salary = decryptNumber(user?.salary_encrypted) || 0;
    
    // Buscar contas
    const { data: bills } = await supabase
      .from('bills')
      .select('value_encrypted, status')
      .eq('user_id', userId);
    
    const billsWithValues = (bills || []).map(b => ({
      ...b,
      value: decryptNumber(b.value_encrypted) || 0
    }));
    
    const totalDebt = billsWithValues.reduce((sum, b) => sum + b.value, 0);
    const lateBills = billsWithValues.filter(b => b.status === 'late').length;
    const totalBills = billsWithValues.length;
    
    // Buscar investimentos
    const { data: investments } = await supabase
      .from('investments')
      .select('quantity, purchase_price_encrypted, current_price_encrypted')
      .eq('user_id', userId);
    
    const totalInvestments = (investments || []).reduce((sum, inv) => {
      const price = decryptNumber(inv.current_price_encrypted) || decryptNumber(inv.purchase_price_encrypted) || 0;
      return sum + (inv.quantity * price);
    }, 0);
    
    // Buscar bens
    const { data: assets } = await supabase
      .from('assets')
      .select('estimated_value_encrypted')
      .eq('user_id', userId);
    
    const totalAssets = (assets || []).reduce((sum, a) => sum + decryptNumber(a.estimated_value_encrypted), 0);
    
    // Buscar reserva de emergência
    const { data: emergencyFund } = await supabase
      .from('emergency_fund')
      .select('current_amount')
      .eq('user_id', userId)
      .single();
    
    const emergencyAmount = emergencyFund?.current_amount || 0;
    
    // Calcular scores parciais (0-100)
    let score = 0;
    const factors = {};
    
    // 1. Dívidas (30% do score)
    const debtRatio = salary > 0 ? Math.min(100, (totalDebt / salary) * 100) : 50;
    const debtScore = Math.max(0, 100 - debtRatio);
    score += debtScore * 0.3;
    factors.debt = { value: debtRatio.toFixed(1), score: debtScore.toFixed(1), weight: 30 };
    
    // 2. Contas atrasadas (20% do score)
    const lateRatio = totalBills > 0 ? (lateBills / totalBills) * 100 : 0;
    const lateScore = Math.max(0, 100 - (lateRatio * 2));
    score += lateScore * 0.2;
    factors.lateBills = { value: lateBills, score: lateScore.toFixed(1), weight: 20 };
    
    // 3. Patrimônio (20% do score)
    const netWorth = totalAssets + totalInvestments + emergencyAmount - totalDebt;
    let wealthScore = 0;
    if (netWorth > 0) {
      wealthScore = Math.min(100, netWorth / 1000);
    }
    score += wealthScore * 0.2;
    factors.wealth = { value: netWorth, score: wealthScore.toFixed(1), weight: 20 };
    
    // 4. Reserva de emergência (15% do score)
    const monthlyExpenses = totalDebt > 0 ? totalDebt : 1;
    const safetyMonths = emergencyAmount / monthlyExpenses;
    let emergencyScore = 0;
    if (safetyMonths >= 12) emergencyScore = 100;
    else if (safetyMonths >= 6) emergencyScore = 80;
    else if (safetyMonths >= 3) emergencyScore = 50;
    else if (safetyMonths > 0) emergencyScore = 25;
    else emergencyScore = 0;
    score += emergencyScore * 0.15;
    factors.emergency = { value: safetyMonths.toFixed(1), score: emergencyScore.toFixed(1), weight: 15 };
    
    // 5. Investimentos (15% do score)
    const investmentRatio = salary > 0 ? Math.min(100, (totalInvestments / salary) * 100) : 0;
    let investmentScore = 0;
    if (investmentRatio >= 50) investmentScore = 100;
    else if (investmentRatio >= 25) investmentScore = 75;
    else if (investmentRatio >= 10) investmentScore = 50;
    else if (investmentRatio >= 5) investmentScore = 25;
    else investmentScore = Math.min(25, investmentRatio * 5);
    score += investmentScore * 0.15;
    factors.investments = { value: investmentRatio.toFixed(1), score: investmentScore.toFixed(1), weight: 15 };
    
    // Score final (0-100)
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));
    
    // Atualizar score no banco
    await supabase
      .from('financial_score')
      .upsert({
        user_id: userId,
        score: finalScore,
        factors,
        updated_at: new Date()
      }, { onConflict: 'user_id' });
    
    return { score: finalScore, factors };
  } catch (err) {
    console.error('Calculate score error:', err);
    return { score: 50, factors: {} };
  }
}

// GET /api/score - Obter score do usuário
router.get('/', async (req, res) => {
  try {
    const result = await calculateFinancialScore(req.userId);
    res.json(result);
  } catch (err) {
    console.error('Get score error:', err);
    res.status(500).json({ error: 'Erro ao calcular score' });
  }
});

// POST /api/score/recalculate - Forçar recálculo
router.post('/recalculate', async (req, res) => {
  try {
    const result = await calculateFinancialScore(req.userId);
    res.json(result);
  } catch (err) {
    console.error('Recalculate error:', err);
    res.status(500).json({ error: 'Erro ao recalcular score' });
  }
});

module.exports = router;