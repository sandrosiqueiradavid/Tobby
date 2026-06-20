const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');

const riskController = {
  // ===== LISTAR RISCOS =====
  async getRisks(req, res) {
    try {
      const { is_resolved } = req.query;
      let query = supabase
        .from('risk_predictions')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });

      if (is_resolved !== undefined) {
        query = query.eq('is_resolved', is_resolved === 'true');
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('Get risks error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== ANALISAR RISCOS =====
  async analyzeRisks(req, res) {
    try {
      const userId = req.userId;
      const risks = await detectRisks(userId);

      // Salvar riscos detectados
      const savedRisks = [];
      for (const risk of risks) {
        const { data, error } = await supabase
          .from('risk_predictions')
          .insert({
            user_id: userId,
            risk_type: risk.type,
            title: risk.title,
            description: risk.description,
            probability: risk.probability,
            impact: risk.impact,
            recommendation: risk.recommendation,
            is_resolved: false
          })
          .select()
          .single();

        if (!error) savedRisks.push(data);
      }

      // Marcar riscos antigos como resolvidos se não forem mais relevantes
      await resolveOldRisks(userId, risks);

      res.json({ 
        success: true, 
        data: savedRisks,
        message: `${savedRisks.length} riscos detectados`
      });
    } catch (err) {
      console.error('Analyze risks error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== MARCAR RISCO COMO RESOLVIDO =====
  async resolveRisk(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('risk_predictions')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date() 
        })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error('Resolve risk error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// ===== FUNÇÃO: DETECTAR RISCOS =====
async function detectRisks(userId) {
  const risks = [];

  // Buscar dados do usuário
  const { data: user } = await supabase
    .from('users')
    .select('salary, salary_encrypted')
    .eq('id', userId)
    .single();

  const salary = decryptNumber(user?.salary_encrypted) || user?.salary || 0;

  // Buscar contas
  const { data: bills } = await supabase
    .from('bills')
    .select('value_encrypted, status, due_day, category')
    .eq('user_id', userId);

  const billsWithValues = (bills || []).map(b => ({
    ...b,
    value: decryptNumber(b.value_encrypted) || 0
  }));

  // Buscar reserva de emergência
  const { data: emergency } = await supabase
    .from('emergency_fund')
    .select('current_amount')
    .eq('user_id', userId)
    .single();

  const emergencyAmount = emergency?.current_amount || 0;

  // Buscar score
  const { data: score } = await supabase
    .from('financial_score')
    .select('score')
    .eq('user_id', userId)
    .single();

  // Calcular métricas
  const totalExpenses = billsWithValues.reduce((s, b) => s + b.value, 0);
  const monthlyExpenses = totalExpenses / Math.max(1, bills?.length || 1);
  const pendingBills = billsWithValues.filter(b => b.status === 'pending');
  const lateBills = billsWithValues.filter(b => b.status === 'late');

  // Risco 1: Saldo negativo (gastos > salário)
  if (totalExpenses > salary && salary > 0) {
    const overAmount = totalExpenses - salary;
    risks.push({
      type: 'negative_balance',
      title: '⚠️ Risco de Saldo Negativo',
      description: `Seus gastos mensais (R$ ${totalExpenses.toFixed(2)}) estão R$ ${overAmount.toFixed(2)} acima do seu salário (R$ ${salary.toFixed(2)}).`,
      probability: 85,
      impact: 'high',
      recommendation: 'Reduza gastos não essenciais ou busque renda extra. Priorize contas essenciais.'
    });
  }

  // Risco 2: Reserva de emergência baixa
  if (emergencyAmount < monthlyExpenses * 3 && monthlyExpenses > 0) {
    const monthsNeeded = Math.ceil((monthlyExpenses * 3 - emergencyAmount) / monthlyExpenses);
    risks.push({
      type: 'emergency_depletion',
      title: '⚠️ Reserva de Emergência Baixa',
      description: `Sua reserva (R$ ${emergencyAmount.toFixed(2)}) cobre menos de 3 meses de gastos.`,
      probability: 60,
      impact: 'high',
      recommendation: `Priorize aumentar sua reserva em R$ ${(monthlyExpenses * 3 - emergencyAmount).toFixed(2)}.`
    });
  }

  // Risco 3: Dívidas crescentes
  if (lateBills.length > 0) {
    const lateTotal = lateBills.reduce((s, b) => s + b.value, 0);
    risks.push({
      type: 'debt_growth',
      title: '⚠️ Dívidas em Atraso',
      description: `Você tem ${lateBills.length} conta(s) atrasada(s) no valor de R$ ${lateTotal.toFixed(2)}.`,
      probability: 75,
      impact: 'high',
      recommendation: 'Pague as contas atrasadas imediatamente para evitar juros. Negocie com os credores.'
    });
  }

  // Risco 4: Score caindo
  if (score?.score < 50 && score?.score > 0) {
    risks.push({
      type: 'score_drop',
      title: '⚠️ Score Financeiro Baixo',
      description: `Seu score atual é ${score.score}/100, considerado crítico.`,
      probability: 70,
      impact: 'medium',
      recommendation: 'Foque em pagar contas em dia e reduzir dívidas. Construa uma reserva de emergência.'
    });
  }

  // Risco 5: Alto gasto em uma categoria
  if (billsWithValues.length > 0) {
    const categories = {};
    billsWithValues.forEach(b => {
      const cat = b.category || 'outros';
      categories[cat] = (categories[cat] || 0) + b.value;
    });

    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] > salary * 0.3) {
      risks.push({
        type: 'high_spending',
        title: `⚠️ Alto Gasto em ${sorted[0][0]}`,
        description: `Seus gastos com ${sorted[0][0]} (R$ ${sorted[0][1].toFixed(2)}) representam ${((sorted[0][1] / salary) * 100).toFixed(0)}% da sua renda.`,
        probability: 50,
        impact: 'medium',
        recommendation: `Revise seus gastos com ${sorted[0][0]}. Tente reduzir em 20% neste mês.`
      });
    }
  }

  return risks;
}

// ===== FUNÇÃO: RESOLVER RISCOS ANTIGOS =====
async function resolveOldRisks(userId, currentRisks) {
  // Buscar riscos não resolvidos
  const { data: oldRisks } = await supabase
    .from('risk_predictions')
    .select('id, risk_type')
    .eq('user_id', userId)
    .eq('is_resolved', false);

  if (!oldRisks || oldRisks.length === 0) return;

  const currentTypes = new Set(currentRisks.map(r => r.type));

  for (const old of oldRisks) {
    if (!currentTypes.has(old.risk_type)) {
      await supabase
        .from('risk_predictions')
        .update({ is_resolved: true, resolved_at: new Date() })
        .eq('id', old.id);
    }
  }
}

module.exports = riskController;