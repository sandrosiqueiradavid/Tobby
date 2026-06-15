const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

async function calculateCashForecast(userId) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('salary_encrypted')
      .eq('id', userId)
      .single();
    
    const salary = decryptNumber(user?.salary_encrypted) || 0;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayDay = today.getDate();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const { data: bills } = await supabase
      .from('bills')
      .select('value_encrypted, due_day, status')
      .eq('user_id', userId);
    
    const billsWithValues = (bills || []).map(b => ({
      ...b,
      value: decryptNumber(b.value_encrypted)
    }));
    
    const paidExpenses = billsWithValues
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.value, 0);
    
    const upcomingExpenses = billsWithValues
      .filter(b => b.status === 'pending' && b.due_day >= todayDay)
      .reduce((sum, b) => sum + b.value, 0);
    
    const totalExpenses = paidExpenses + upcomingExpenses;
    const finalBalance = salary - totalExpenses;
    
    let status = 'safe';
    let message = '';
    let recommendation = '';
    
    if (finalBalance < 0) {
      status = 'critical';
      message = `⚠️ Atenção! Você pode ficar negativo em R$ ${Math.abs(finalBalance).toLocaleString('pt-BR')}`;
      recommendation = 'Reduza gastos imediatamente ou busque renda extra.';
    } else if (finalBalance < salary * 0.1) {
      status = 'warning';
      message = `🐶 Cuidado! Seu saldo previsto é de apenas ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalBalance)}`;
      recommendation = 'Evite compras não essenciais até o fim do mês.';
    } else {
      message = `✅ Previsão positiva! Você deve terminar o mês com ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalBalance)}`;
      recommendation = finalBalance > salary * 0.3 ? 'Que tal investir parte desse valor?' : 'Continue no controle!';
    }
    
    const forecastDate = new Date(currentYear, currentMonth, lastDayOfMonth);
    
    await supabase
      .from('cash_forecast')
      .upsert({
        user_id: userId,
        forecast_date: forecastDate,
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
      recommendation,
      today: todayDay,
      days_left: lastDayOfMonth - todayDay,
      forecast_date: forecastDate.toISOString().split('T')[0]
    };
  } catch (err) {
    console.error('Cash forecast error:', err);
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const forecast = await calculateCashForecast(req.userId);
    if (!forecast) {
      return res.status(500).json({ error: 'Erro ao calcular previsão' });
    }
    res.json(forecast);
  } catch (err) {
    console.error('Get forecast error:', err);
    res.status(500).json({ error: 'Erro ao calcular previsão de caixa' });
  }
});

module.exports = router;