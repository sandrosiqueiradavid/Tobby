// src/controllers/riskController.js
const supabase = require('../db/supabase');
const { decryptNumber } = require('../services/encryptionService');

const riskController = {
  // ===== LISTAR RISCOS =====
  async getRisks(req, res) {
    try {
      const { is_resolved, limit = 50, offset = 0 } = req.query;

      console.log(`[RISKS] 📋 Listando riscos para usuário ${req.userId}`);

      let query = supabase
        .from('risk_predictions')
        .select('*', { count: 'exact' })
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (is_resolved !== undefined) {
        query = query.eq('is_resolved', is_resolved === 'true');
      }

      const { data, error, count } = await query;
      
      if (error) throw error;

      // Calcular estatísticas
      const total = data?.length || 0;
      const active = data?.filter(r => !r.is_resolved).length || 0;
      const resolved = data?.filter(r => r.is_resolved).length || 0;
      
      // Agrupar por impacto
      const byImpact = {};
      data?.forEach(r => {
        byImpact[r.impact] = (byImpact[r.impact] || 0) + 1;
      });

      console.log(`[RISKS] ✅ ${total} riscos encontrados (${active} ativos, ${resolved} resolvidos)`);

      res.json({
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        stats: {
          total,
          active,
          resolved,
          byImpact
        }
      });
    } catch (err) {
      console.error('[RISKS] ❌ Get risks error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao listar riscos: ' + err.message 
      });
    }
  },

  // ===== ANALISAR RISCOS =====
  async analyzeRisks(req, res) {
    try {
      const userId = req.userId;

      console.log(`[RISKS] 🔍 Analisando riscos para usuário ${userId}`);

      // Detectar riscos
      const risks = await detectRisks(userId);

      if (risks.length === 0) {
        console.log(`[RISKS] ℹ️ Nenhum risco detectado para usuário ${userId}`);
        return res.json({
          success: true,
          data: [],
          message: 'Nenhum risco detectado. Sua situação financeira parece saudável! 🎉'
        });
      }

      // Salvar riscos detectados
      const savedRisks = [];
      for (const risk of risks) {
        // Verificar se já existe um risco similar não resolvido
        const { data: existing } = await supabase
          .from('risk_predictions')
          .select('id')
          .eq('user_id', userId)
          .eq('risk_type', risk.type)
          .eq('is_resolved', false)
          .maybeSingle();

        if (existing) {
          console.log(`[RISKS] ⏭️ Risco "${risk.type}" já existe, pulando...`);
          continue;
        }

        const { data, error } = await supabase
          .from('risk_predictions')
          .insert({
            user_id: userId,
            risk_type: risk.type,
            title: risk.title,
            description: risk.description,
            probability: risk.probability || 50,
            impact: risk.impact || 'medium',
            recommendation: risk.recommendation || null,
            is_resolved: false,
            created_at: new Date()
          })
          .select()
          .single();

        if (!error && data) {
          savedRisks.push(data);
        }
      }

      // Marcar riscos antigos como resolvidos se não forem mais relevantes
      await resolveOldRisks(userId, risks);

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          action: 'RISK_ANALYSIS',
          table_name: 'risk_predictions',
          new_value: { 
            risks_detected: savedRisks.length,
            total_risks: risks.length
          }
        });

      console.log(`[RISKS] ✅ ${savedRisks.length} novos riscos detectados e salvos`);

      res.json({
        success: true,
        data: savedRisks,
        message: `${savedRisks.length} risco(s) detectado(s). Verifique-os para tomar ação!`
      });
    } catch (err) {
      console.error('[RISKS] ❌ Analyze risks error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao analisar riscos: ' + err.message 
      });
    }
  },

  // ===== MARCAR RISCO COMO RESOLVIDO =====
  async resolveRisk(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID do risco é obrigatório' 
        });
      }

      console.log(`[RISKS] ✅ Resolvendo risco ${id} para usuário ${req.userId}`);

      // Verificar se o risco existe
      const { data: existing, error: findError } = await supabase
        .from('risk_predictions')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (findError || !existing) {
        return res.status(404).json({ 
          success: false, 
          error: 'Risco não encontrado' 
        });
      }

      if (existing.is_resolved) {
        return res.status(400).json({ 
          success: false, 
          error: 'Este risco já foi resolvido' 
        });
      }

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

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'RISK_RESOLVED',
          table_name: 'risk_predictions',
          new_value: { 
            risk_id: id,
            risk_type: existing.risk_type,
            resolved_at: new Date().toISOString()
          }
        });

      console.log(`[RISKS] ✅ Risco ${id} resolvido com sucesso`);

      res.json({
        success: true,
        data,
        message: 'Risco marcado como resolvido! 🎉'
      });
    } catch (err) {
      console.error('[RISKS] ❌ Resolve risk error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao resolver risco: ' + err.message 
      });
    }
  },

  // ===== RESUMO DOS RISCOS =====
  async getSummary(req, res) {
    try {
      console.log(`[RISKS] 📊 Resumo de riscos para usuário ${req.userId}`);

      const { data, error } = await supabase
        .from('risk_predictions')
        .select('risk_type, impact, is_resolved, probability')
        .eq('user_id', req.userId);

      if (error) throw error;

      const risks = data || [];
      const active = risks.filter(r => !r.is_resolved);
      const resolved = risks.filter(r => r.is_resolved);

      // Riscos por tipo
      const byType = {};
      active.forEach(r => {
        byType[r.risk_type] = (byType[r.risk_type] || 0) + 1;
      });

      // Riscos por impacto
      const byImpact = { low: 0, medium: 0, high: 0, critical: 0 };
      active.forEach(r => {
        if (byImpact[r.impact] !== undefined) byImpact[r.impact]++;
      });

      // Média de probabilidade dos riscos ativos
      const avgProbability = active.length > 0 
        ? (active.reduce((sum, r) => sum + (r.probability || 0), 0) / active.length).toFixed(0)
        : 0;

      res.json({
        success: true,
        summary: {
          total: risks.length,
          active: active.length,
          resolved: resolved.length,
          byType,
          byImpact,
          avgProbability: parseInt(avgProbability),
          hasHighRisk: active.some(r => r.impact === 'high' || r.impact === 'critical'),
          hasCriticalRisk: active.some(r => r.impact === 'critical')
        },
        activeRisks: active.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          impact: r.impact,
          probability: r.probability
        }))
      });
    } catch (err) {
      console.error('[RISKS] ❌ Get summary error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao gerar resumo: ' + err.message 
      });
    }
  },

  // ===== HISTÓRICO DE RISCOS =====
  async getHistory(req, res) {
    try {
      const { limit = 30 } = req.query;

      console.log(`[RISKS] 📜 Histórico de riscos para usuário ${req.userId}`);

      const { data, error } = await supabase
        .from('risk_predictions')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;

      // Agrupar por mês
      const monthly = {};
      (data || []).forEach(r => {
        const month = new Date(r.created_at).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        if (!monthly[month]) monthly[month] = { total: 0, resolved: 0 };
        monthly[month].total++;
        if (r.is_resolved) monthly[month].resolved++;
      });

      res.json({
        success: true,
        data: data || [],
        monthly,
        total: data?.length || 0
      });
    } catch (err) {
      console.error('[RISKS] ❌ Get history error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar histórico: ' + err.message 
      });
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
  const monthlyExpenses = billsWithValues.length > 0 ? totalExpenses / billsWithValues.length : 0;
  const lateBills = billsWithValues.filter(b => b.status === 'late');
  const pendingBills = billsWithValues.filter(b => b.status === 'pending');

  // Risco 1: Saldo negativo
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
  if (emergencyAmount < monthlyExpenses * 3 && monthlyExpenses > 0 && salary > 0) {
    const monthsNeeded = Math.ceil((monthlyExpenses * 3 - emergencyAmount) / (salary * 0.2 || 1));
    risks.push({
      type: 'emergency_depletion',
      title: '⚠️ Reserva de Emergência Baixa',
      description: `Sua reserva (R$ ${emergencyAmount.toFixed(2)}) cobre menos de 3 meses de gastos (R$ ${(monthlyExpenses * 3).toFixed(2)}).`,
      probability: 70,
      impact: 'high',
      recommendation: `Priorize aumentar sua reserva em R$ ${(monthlyExpenses * 3 - emergencyAmount).toFixed(2)}.`
    });
  }

  // Risco 3: Dívidas em atraso
  if (lateBills.length > 0) {
    const lateTotal = lateBills.reduce((s, b) => s + b.value, 0);
    risks.push({
      type: 'debt_growth',
      title: '⚠️ Dívidas em Atraso',
      description: `Você tem ${lateBills.length} conta(s) atrasada(s) no valor de R$ ${lateTotal.toFixed(2)}.`,
      probability: 80,
      impact: 'high',
      recommendation: 'Pague as contas atrasadas imediatamente para evitar juros. Negocie com os credores.'
    });
  }

  // Risco 4: Score baixo
  if (score?.score < 50 && score?.score > 0) {
    risks.push({
      type: 'score_drop',
      title: '⚠️ Score Financeiro Baixo',
      description: `Seu score atual é ${score.score}/100, considerado abaixo do ideal.`,
      probability: 65,
      impact: 'medium',
      recommendation: 'Foque em pagar contas em dia e reduzir dívidas para melhorar seu score.'
    });
  }

  // Risco 5: Alto gasto em uma categoria
  if (billsWithValues.length > 0 && salary > 0) {
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

  // Risco 6: Muitas contas pendentes
  if (pendingBills.length > 3) {
    const pendingTotal = pendingBills.reduce((s, b) => s + b.value, 0);
    risks.push({
      type: 'pending_bills',
      title: '⚠️ Muitas Contas Pendentes',
      description: `Você tem ${pendingBills.length} conta(s) pendentes no valor de R$ ${pendingTotal.toFixed(2)}.`,
      probability: 60,
      impact: 'medium',
      recommendation: `Organize o pagamento de ${pendingBills.length} contas pendentes para evitar atrasos.`
    });
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

  let resolvedCount = 0;
  for (const old of oldRisks) {
    if (!currentTypes.has(old.risk_type)) {
      await supabase
        .from('risk_predictions')
        .update({ is_resolved: true, resolved_at: new Date() })
        .eq('id', old.id);
      resolvedCount++;
    }
  }

  if (resolvedCount > 0) {
    console.log(`[RISKS] 🎉 ${resolvedCount} riscos antigos resolvidos automaticamente`);
  }
}

module.exports = riskController;