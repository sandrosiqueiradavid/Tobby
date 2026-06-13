const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');

const decisionSimulator = {
  async simulate(req, res) {
    try {
      const { decision, amount, installments, interestRate } = req.body;
      
      if (!decision || !amount) {
        return res.status(400).json({ error: 'Decisão e valor são obrigatórios' });
      }
      
      // Buscar dados do usuário
      const { data: user } = await supabase
        .from('users')
        .select('salary_encrypted')
        .eq('id', req.userId)
        .single();
      
      const { data: bills } = await supabase
        .from('bills')
        .select('value_encrypted, status')
        .eq('user_id', req.userId);
      
      const salary = decryptNumber(user?.salary_encrypted) || 0;
      const monthlyExpenses = (bills || [])
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + decryptNumber(b.value_encrypted), 0);
      
      const freeMonthly = salary - monthlyExpenses;
      
      // Calcular impacto
      let monthlyPayment = 0;
      let totalCost = amount;
      let advice = '';
      
      if (decision === 'financing' && installments && interestRate) {
        const rate = interestRate / 100;
        monthlyPayment = (amount * rate * Math.pow(1 + rate, installments)) / (Math.pow(1 + rate, installments) - 1);
        totalCost = monthlyPayment * installments;
        advice = `Este financiamento teria parcelas de R$ ${monthlyPayment.toFixed(2)} por ${installments} meses.`;
      } else if (decision === 'purchase') {
        monthlyPayment = 0;
        advice = `Esta compra de R$ ${amount.toFixed(2)} custaria ${Math.ceil(amount / freeMonthly)} meses do seu saldo livre.`;
      }
      
      const isAffordable = monthlyPayment <= freeMonthly * 0.3;
      
      res.json({
        decision,
        amount,
        monthlyPayment,
        totalCost,
        interestTotal: totalCost - amount,
        userContext: {
          salary,
          monthlyExpenses,
          freeMonthly
        },
        isAffordable,
        advice,
        recommendation: isAffordable 
          ? '✅ Com base no seu orçamento, esta decisão parece viável.'
          : '⚠️ Atenção! Esta decisão comprometeria mais de 30% do seu saldo livre mensal.'
      });
      
    } catch (err) {
      console.error('Simulation error:', err);
      res.status(500).json({ error: 'Erro ao simular decisão' });
    }
  }
};

module.exports = decisionSimulator;