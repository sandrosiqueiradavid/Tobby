const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

async function calculateCashForecast(userId) {
  try {
    // Buscar dados do usuário
    const { data: user } = await supabase
      .from('users')
      .select('salary_encrypted')
      .eq('id', userId)
      .single();
    
    const salary = decryptNumber(user?.salary_encrypted) || 0;
    
    // Buscar contas do mês
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const { data: bills } = await supabase
      .from('bills')
      .select('value_encrypted, due_day, status')
      .eq('user_id', userId);
    
    const billsWithValues = (bills || []).map(b => ({
      ...b,
      value: decryptNumber(b.value_encrypted)
    }));
    
    // Calcular gastos já pagos
    const paidExpenses = billsWithValues
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.value, 0);
    
    // Calcular gastos previstos para o resto do mês
    const todayDay = today.getDate();
    const upcomingExpenses = billsWithValues
      .filter(b => b.status === 'pending' && b.due_day >= todayDay)
      .reduce((sum, b) => sum + b.value, 0);
    
    const totalExpenses = paidExpenses + upcomingExpenses;
    
    // Previsão de saldo final
    const finalBalance = salary - totalExpenses;
    
    // Status da previsão
    let status = 'safe';
    let message = '';
    
    if (finalBalance < 0) {
      status = 'critical';
      message = `⚠️ Atenção! Você pode ficar negativo em R$ ${Math.abs(finalBalance).toLocaleString('pt-BR')}`;
    } else if (finalBalance < salary * 0.1) {
      status = 'warning';
      message = `🐶 Cuidado! Seu saldo previsto é de apenas ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalBalance)}`;
    } else {
      message = `✅ Previsão positiva! Você deve terminar o mês com ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalBalance)}`;
    }
    
    // Registrar previsão no banco
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    await supabase
      .from('cash_forecast')
      .upsert({
        user_id: userId,
        forecast_date: lastDay,
        expected_balance: finalBalance,
        confidence: 85
      }, { onConflict: 'user_id,forecast_date' });
    
    return {
      salary,
      paid_expenses: paidExpenses,
      upcoming_expenses: upcomingExpenses,
      total_expenses: totalExpenses,
      final_balance: finalBalance,
      status,
      message,
      today: todayDay,
      days_left: new Date(currentYear, currentMonth + 1, 0).getDate() - todayDay
    };
  } catch (err) {
    console.error('Cash forecast error:', err);
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const forecast = await calculateCashForecast(req.userId);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular previsão' });
  }
});

module.exports = router;