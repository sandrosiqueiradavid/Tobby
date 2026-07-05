// src/controllers/executiveController.js
const supabase = require('../db/supabase');
const { decryptNumber } = require('../services/encryptionService');

const executiveController = {
  // ===== OBTER DASHBOARD EXECUTIVO =====
  async getExecutiveDashboard(req, res) {
    try {
      const userId = req.userId;

      console.log(`[EXECUTIVE] 📊 Gerando dashboard executivo para usuário ${userId}`);

      // Buscar todos os dados necessários em paralelo
      const [
        userData,
        billsData,
        investmentsData,
        loansData,
        assetsData,
        emergencyData,
        scoreData,
        dreamsData,
        risksData,
        achievementsData,
        memoryData
      ] = await Promise.all([
        getUserInfo(userId),
        getBillsInfo(userId),
        getInvestmentsInfo(userId),
        getLoansInfo(userId),
        getAssetsInfo(userId),
        getEmergencyFundInfo(userId),
        getScoreInfo(userId),
        getDreamsInfo(userId),
        getRisksInfo(userId),
        getAchievementsInfo(userId),
        getMemoryInfo(userId)
      ]);

      // Calcular métricas adicionais
      const netWorth = assetsData.total + investmentsData.total - loansData.total;
      const monthlyExpenses = billsData.total / Math.max(1, billsData.count || 1);
      const monthsOfSafety = monthlyExpenses > 0 ? emergencyData.amount / monthlyExpenses : 0;
      const savingsRate = userData.salary > 0 
        ? ((userData.salary - billsData.paidValue) / userData.salary * 100) 
        : 0;

      // Gerar resumo executivo
      const executiveSummary = generateExecutiveSummary({
        user: userData,
        bills: billsData,
        investments: investmentsData,
        loans: loansData,
        assets: assetsData,
        emergency: emergencyData,
        score: scoreData,
        dreams: dreamsData,
        risks: risksData,
        achievements: achievementsData,
        netWorth,
        monthsOfSafety,
        savingsRate
      });

      // Registrar acesso ao dashboard
      await supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          action: 'EXECUTIVE_DASHBOARD_ACCESS',
          table_name: 'executive_dashboard',
          new_value: { 
            score: scoreData.score,
            netWorth: netWorth,
            riskCount: risksData.activeCount,
            dreamCount: dreamsData.count
          }
        });

      console.log(`[EXECUTIVE] ✅ Dashboard executivo gerado com sucesso para usuário ${userId}`);

      res.json({
        success: true,
        data: {
          user: userData,
          financial: {
            salary: userData.salary,
            monthlyExpenses: monthlyExpenses,
            totalBills: billsData.total,
            totalInvestments: investmentsData.total,
            totalLoans: loansData.total,
            totalAssets: assetsData.total,
            netWorth: netWorth,
            savingsRate: Math.max(0, Math.min(100, savingsRate)).toFixed(1) + '%'
          },
          health: {
            score: scoreData.score,
            emergency: {
              amount: emergencyData.amount,
              monthsOfSafety: monthsOfSafety.toFixed(1)
            },
            riskCount: risksData.activeCount
          },
          progress: {
            dreams: dreamsData,
            achievements: achievementsData,
            hasMemory: memoryData.hasMemory
          },
          summary: executiveSummary,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('[EXECUTIVE] ❌ Executive dashboard error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao gerar dashboard executivo: ' + err.message 
      });
    }
  }
};

// ===== FUNÇÕES AUXILIARES =====

async function getUserInfo(userId) {
  try {
    const { data } = await supabase
      .from('users')
      .select('name, email, salary, salary_encrypted, created_at')
      .eq('id', userId)
      .single();

    const salary = decryptNumber(data?.salary_encrypted) || data?.salary || 0;
    return { 
      ...data, 
      salary,
      memberSince: data?.created_at ? new Date(data.created_at).toLocaleDateString('pt-BR') : 'N/A'
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar usuário:', err);
    return { name: 'Usuário', email: '', salary: 0, memberSince: 'N/A' };
  }
}

async function getBillsInfo(userId) {
  try {
    const { data } = await supabase
      .from('bills')
      .select('value_encrypted, status')
      .eq('user_id', userId);

    const bills = (data || []).map(b => ({
      ...b,
      value: decryptNumber(b.value_encrypted) || 0
    }));

    const total = bills.reduce((s, b) => s + b.value, 0);
    const paid = bills.filter(b => b.status === 'paid');
    const pending = bills.filter(b => b.status === 'pending');
    const late = bills.filter(b => b.status === 'late');

    return {
      total,
      count: bills.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      lateCount: late.length,
      paidValue: paid.reduce((s, b) => s + b.value, 0),
      pendingValue: pending.reduce((s, b) => s + b.value, 0),
      lateValue: late.reduce((s, b) => s + b.value, 0)
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar contas:', err);
    return { total: 0, count: 0, paidCount: 0, pendingCount: 0, lateCount: 0, paidValue: 0, pendingValue: 0, lateValue: 0 };
  }
}

async function getInvestmentsInfo(userId) {
  try {
    const { data } = await supabase
      .from('investments')
      .select('quantity, purchase_price_encrypted, current_price_encrypted')
      .eq('user_id', userId);

    const total = (data || []).reduce((s, inv) => {
      const price = decryptNumber(inv.current_price_encrypted) || decryptNumber(inv.purchase_price_encrypted) || 0;
      return s + (inv.quantity * price);
    }, 0);

    return {
      total,
      count: data?.length || 0
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar investimentos:', err);
    return { total: 0, count: 0 };
  }
}

async function getLoansInfo(userId) {
  try {
    const { data } = await supabase
      .from('loans')
      .select('outstanding_balance_encrypted')
      .eq('user_id', userId);

    const total = (data || []).reduce((s, l) => {
      return s + (decryptNumber(l.outstanding_balance_encrypted) || 0);
    }, 0);

    return {
      total,
      count: data?.length || 0
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar financiamentos:', err);
    return { total: 0, count: 0 };
  }
}

async function getAssetsInfo(userId) {
  try {
    const { data } = await supabase
      .from('assets')
      .select('estimated_value_encrypted')
      .eq('user_id', userId);

    const total = (data || []).reduce((s, a) => {
      return s + (decryptNumber(a.estimated_value_encrypted) || 0);
    }, 0);

    return {
      total,
      count: data?.length || 0
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar bens:', err);
    return { total: 0, count: 0 };
  }
}

async function getEmergencyFundInfo(userId) {
  try {
    const { data } = await supabase
      .from('emergency_fund')
      .select('current_amount')
      .eq('user_id', userId)
      .single();

    return {
      amount: data?.current_amount || 0
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar reserva:', err);
    return { amount: 0 };
  }
}

async function getScoreInfo(userId) {
  try {
    const { data } = await supabase
      .from('financial_score')
      .select('score')
      .eq('user_id', userId)
      .single();

    return {
      score: data?.score || 0
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar score:', err);
    return { score: 0 };
  }
}

async function getDreamsInfo(userId) {
  try {
    const { data } = await supabase
      .from('dream_center')
      .select('target_value, current_value, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    const total = (data || []).reduce((s, d) => s + d.target_value, 0);
    const current = (data || []).reduce((s, d) => s + d.current_value, 0);
    const progress = total > 0 ? (current / total) * 100 : 0;

    return {
      count: data?.length || 0,
      total,
      current,
      progress: Math.min(progress, 100)
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar sonhos:', err);
    return { count: 0, total: 0, current: 0, progress: 0 };
  }
}

async function getRisksInfo(userId) {
  try {
    const { data } = await supabase
      .from('risk_predictions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_resolved', false);

    return {
      activeCount: data?.length || 0
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar riscos:', err);
    return { activeCount: 0 };
  }
}

async function getAchievementsInfo(userId) {
  try {
    const { data } = await supabase
      .from('user_achievement_progress')
      .select('id, achievement_level_id, progress, is_completed, completed_at')
      .eq('user_id', userId)
      .eq('is_completed', true);

    const { data: allProgress } = await supabase
      .from('user_achievement_progress')
      .select('id')
      .eq('user_id', userId);

    return {
      completedCount: data?.length || 0,
      totalProgress: allProgress?.length || 0,
      recentAchievements: data?.slice(0, 3).map(a => ({
        id: a.achievement_level_id,
        completed_at: a.completed_at
      })) || []
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar conquistas:', err);
    return { completedCount: 0, totalProgress: 0, recentAchievements: [] };
  }
}

async function getMemoryInfo(userId) {
  try {
    const { data } = await supabase
      .from('tobby_memory')
      .select('id, memory_type, memory_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      hasMemory: (data?.length || 0) > 0,
      lastMemory: data?.[0] || null
    };
  } catch (err) {
    console.error('[EXECUTIVE] ❌ Erro ao buscar memórias:', err);
    return { hasMemory: false, lastMemory: null };
  }
}

function generateExecutiveSummary(data) {
  const { 
    user, 
    bills, 
    investments, 
    loans, 
    assets, 
    emergency, 
    score, 
    dreams, 
    risks, 
    achievements,
    netWorth,
    monthsOfSafety,
    savingsRate
  } = data;
  
  const name = user?.name || 'Usuário';

  let summary = `🐶 Olá, ${name}! Aqui está seu resumo executivo:\n\n`;

  // Saúde Financeira
  let healthStatus = '';
  let healthEmoji = '';
  if (score.score >= 80) {
    healthStatus = 'Excelente! 🏆';
    healthEmoji = '🏆';
  } else if (score.score >= 60) {
    healthStatus = 'Boa, com espaço para melhorias 📈';
    healthEmoji = '📈';
  } else if (score.score >= 40) {
    healthStatus = 'Atenção necessária ⚠️';
    healthEmoji = '⚠️';
  } else if (score.score >= 20) {
    healthStatus = 'Precisa de cuidado! 🔴';
    healthEmoji = '🔴';
  } else {
    healthStatus = 'Crítica! 🆘';
    healthEmoji = '🆘';
  }
  summary += `📊 Saúde Financeira: ${healthStatus} (Score: ${score.score}/100)\n`;

  // Resumo Financeiro
  summary += `\n💰 Resumo Financeiro:\n`;
  summary += `  • Salário: R$ ${user.salary?.toFixed(2) || '0,00'}\n`;
  summary += `  • Patrimônio Líquido: R$ ${netWorth.toFixed(2)}\n`;
  summary += `  • Dívidas: R$ ${loans.total.toFixed(2)}\n`;
  summary += `  • Investimentos: R$ ${investments.total.toFixed(2)}\n`;
  
  if (emergency.amount > 0) {
    summary += `  • Reserva de Emergência: R$ ${emergency.amount.toFixed(2)} (${monthsOfSafety.toFixed(1)} meses)\n`;
  } else {
    summary += `  • Reserva de Emergência: Não criada\n`;
  }
  
  summary += `  • Taxa de Economia: ${savingsRate.toFixed(1)}%\n`;

  // Alertas
  if (risks.activeCount > 0) {
    summary += `\n⚠️ Você tem ${risks.activeCount} risco(s) ativo(s). Verifique a central de riscos.\n`;
  }

  if (bills.lateCount > 0) {
    summary += `\n🔴 Você tem ${bills.lateCount} conta(s) atrasada(s). Regularize o quanto antes!\n`;
  }

  // Sonhos
  if (dreams.count > 0) {
    summary += `\n🎯 Você tem ${dreams.count} sonho(s) ativo(s). Progresso geral: ${dreams.progress.toFixed(0)}%\n`;
  } else {
    summary += `\n🌟 Que tal criar um sonho hoje? É o primeiro passo para realizá-lo!\n`;
  }

  // Conquistas
  if (achievements.completedCount > 0) {
    summary += `\n🏆 Você já conquistou ${achievements.completedCount} medalha(s)! Continue assim!\n`;
  }

  // Dica final personalizada
  summary += `\n💡 Dica do Dia: `;
  if (emergency.amount < user.salary * 3 && user.salary > 0) {
    summary += `Foque em construir sua reserva de emergência (meta: 6 meses de gastos).`;
  } else if (investments.total === 0) {
    summary += `Comece a investir para construir seu patrimônio. Tesouro Direto é um bom começo.`;
  } else if (loans.total > 0) {
    summary += `Priorize quitar suas dívidas para melhorar seu score e liberar renda.`;
  } else if (dreams.count === 0) {
    summary += `Defina um sonho financeiro! Ter um objetivo claro ajuda a manter o foco.`;
  } else if (savingsRate < 20) {
    summary += `Tente aumentar sua taxa de economia para 20% da sua renda.`;
  } else {
    summary += `Continue no caminho certo! Revise seus sonhos e planeje o próximo passo.`;
  }

  summary += `\n\n🐶 Estou aqui para te ajudar a alcançar seus objetivos!`;

  return summary;
}

module.exports = executiveController;