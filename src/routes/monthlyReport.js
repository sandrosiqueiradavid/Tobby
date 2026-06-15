const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

async function generateMonthlyReport(userId, year, month) {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    // Buscar dados do usuário
    const { data: user } = await supabase
      .from('users')
      .select('name, salary_encrypted')
      .eq('id', userId)
      .single();
    
    const salary = decryptNumber(user?.salary_encrypted) || 0;
    
    // Buscar contas do mês
    const { data: bills } = await supabase
      .from('bills')
      .select('value_encrypted, status, category')
      .eq('user_id', userId);
    
    const billsWithValues = (bills || []).map(b => ({
      ...b,
      value: decryptNumber(b.value_encrypted)
    }));
    
    const totalExpenses = billsWithValues.reduce((sum, b) => sum + b.value, 0);
    const paidExpenses = billsWithValues
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.value, 0);
    
    // Gastos por categoria
    const expensesByCategory = {};
    billsWithValues.forEach(b => {
      const cat = b.category || 'outros';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + b.value;
    });
    
    // Buscar mês anterior para comparação
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    
    const { data: prevBills } = await supabase
      .from('bills')
      .select('value_encrypted')
      .eq('user_id', userId);
    
    const prevTotal = (prevBills || []).reduce((sum, b) => sum + decryptNumber(b.value_encrypted), 0);
    const expenseChange = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : 0;
    
    // Buscar score atual
    const { data: scoreData } = await supabase
      .from('financial_score')
      .select('score')
      .eq('user_id', userId)
      .single();
    
    // Buscar metas
    const { data: goals } = await supabase
      .from('financial_goals')
      .select('name, current_amount, target_amount')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    // Buscar reserva
    const { data: emergencyFund } = await supabase
      .from('emergency_fund')
      .select('current_amount')
      .eq('user_id', userId)
      .single();
    
    const savings = emergencyFund?.current_amount || 0;
    const savingsChange = savings - (emergencyFund?.current_amount || 0);
    
    // Gerar carta personalizada
    let letter = '';
    if (expenseChange < -5) {
      letter = `🐶 PARABENS! Você reduziu seus gastos em ${Math.abs(expenseChange).toFixed(1)}% este mês! Continue assim!`;
    } else if (expenseChange > 5) {
      letter = `🐶 Atenção: Seus gastos aumentaram ${expenseChange.toFixed(1)}% em relação ao mês passado. Vamos revisar juntos?`;
    } else {
      letter = `🐶 Seus gastos estão estáveis. Ótimo trabalho mantendo o controle!`;
    }
    
    if (savings > 0 && savingsChange > 0) {
      letter += `\n\n💰 Sua reserva de emergência cresceu R$ ${savingsChange.toLocaleString('pt-BR')}! 🎉`;
    }
    
    if (goals && goals.length > 0) {
      const closestGoal = goals[0];
      const progress = (closestGoal.current_amount / closestGoal.target_amount) * 100;
      letter += `\n\n🎯 Você está ${progress.toFixed(0)}% mais perto da sua meta "${closestGoal.name}"!`;
    }
    
    const report = {
      month: new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      salary,
      total_expenses: totalExpenses,
      paid_expenses: paidExpenses,
      savings_rate: salary > 0 ? ((salary - totalExpenses) / salary) * 100 : 0,
      free_balance: salary - totalExpenses,
      expenses_by_category: expensesByCategory,
      expense_change_vs_last_month: expenseChange,
      current_score: scoreData?.score || 0,
      letter,
      generated_at: new Date().toISOString()
    };
    
    // Salvar relatório
    await supabase
      .from('monthly_reports')
      .upsert({
        user_id: userId,
        reference_month: new Date(year, month, 1),
        report_data: report
      }, { onConflict: 'user_id,reference_month' });
    
    return report;
  } catch (err) {
    console.error('Generate report error:', err);
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const today = new Date();
    const report = await generateMonthlyReport(req.userId, today.getFullYear(), today.getMonth());
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { data: reports } = await supabase
      .from('monthly_reports')
      .select('report_data, reference_month')
      .eq('user_id', req.userId)
      .order('reference_month', { ascending: false })
      .limit(12);
    
    res.json({ reports: reports?.map(r => r.report_data) || [] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

module.exports = router;