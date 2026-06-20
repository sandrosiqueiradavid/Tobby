const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');

const executiveController = {
  // ===== OBTER DASHBOARD EXECUTIVO =====
  async getExecutiveDashboard(req, res) {
    try {
      const userId = req.userId;

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

      // Gerar resumo executivo com IA
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
        achievements: achievementsData
      });

      res.json({
        success: true,
        data: {
          user: userData,
          financial: {
            salary: userData.salary,
            totalBills: billsData.total,
            totalInvestments: investmentsData.total,
            totalLoans: loansData.total,
            totalAssets: assetsData.total,
            netWorth: assetsData.total + investmentsData.total - loansData.total
          },
          health: {
            score: scoreData.score,
            emergency: emergencyData,
            riskCount: risksData.activeCount
          },
          progress: {
            dreams: dreamsData,
            achievements: achievementsData
          },
          summary: executiveSummary
        }
      });
    } catch (err) {
      console.error('Executive dashboard error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// ===== FUNÇÕES AUXILIARES =====
async function getUserInfo(userId) {
  const { data } = await supabase
    .from('users')
    .select('name, email, salary, salary_encrypted, created_at')
    .eq('id', userId)
    .single();

  const salary = decryptNumber(data?.salary_encrypted) || data?.salary || 0;
  return { ...data, salary };
}

async function getBillsInfo(userId) {
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
    pendingValue: pending.reduce((s, b) => s + b.value, 0)
  };
}

async function getInvestmentsInfo(userId) {
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
}

async function getLoansInfo(userId) {
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
}

async function getAssetsInfo(userId) {
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
}

async function getEmergencyFundInfo(userId) {
  const { data } = await supabase
    .from('emergency_fund')
    .select('current_amount')
    .eq('user_id', userId)
    .single();

  return {
    amount: data?.current_amount || 0
  };
}

async function getScoreInfo(userId) {
  const { data } = await supabase
    .from('financial_score')
    .select('score')
    .eq('user_id', userId)
    .single();

  return {
    score: data?.score || 0
  };
}

async function getDreamsInfo(userId) {
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
}

async function getRisksInfo(userId) {
  const { data } = await supabase
    .from('risk_predictions')
    .select('id')
    .eq('user_id', userId)
    .eq('is_resolved', false);

  return {
    activeCount: data?.length || 0
  };
}

async function getAchievementsInfo(userId) {
  const { data } = await supabase
    .from('user_achievement_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('is_completed', true);

  return {
    completedCount: data?.length || 0
  };
}

async function getMemoryInfo(userId) {
  const { data } = await supabase
    .from('tobby_memory')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  return {
    hasMemory: (data?.length || 0) > 0,
    lastMemory: data?.[0] || null
  };
}

function generateExecutiveSummary(data) {
  const { user, bills, investments, loans, assets, emergency, score, dreams, risks, achievements } = data;
  const netWorth = assets.total + investments.total - loans.total;

  let summary = `🐶 Olá, ${user.name}! Aqui está seu resumo executivo:\n\n`;

  // Saúde Financeira
  let healthStatus = '';
  if (score.score >= 70) healthStatus = 'Excelente! 🏆';
  else if (score.score >= 50) healthStatus = 'Boa, mas com espaço para melhorias 📈';
  else if (score.score >= 30) healthStatus = 'Atenção necessária ⚠️';
  else healthStatus = 'Crítica! 🔴';
  summary += `📊 Saúde Financeira: ${healthStatus} (Score: ${score.score}/100)\n`;

  // Resumo Financeiro
  summary += `\n💰 Resumo Financeiro:\n`;
  summary += `  • Salário: R$ ${user.salary?.toFixed(2) || '0,00'}\n`;
  summary += `  • Patrimônio Líquido: R$ ${netWorth.toFixed(2)}\n`;
  summary += `  • Dívidas: R$ ${loans.total.toFixed(2)}\n`;
  summary += `  • Investimentos: R$ ${investments.total.toFixed(2)}\n`;
  summary += `  • Reserva de Emergência: ${emergency.amount > 0 ? `R$ ${emergency.amount.toFixed(2)}` : 'Não criada'}\n`;

  // Alerta de riscos
  if (risks.activeCount > 0) {
    summary += `\n⚠️ Você tem ${risks.activeCount} risco(s) ativo(s). Verifique a central de riscos.\n`;
  }

  // Sonhos
  if (dreams.count > 0) {
    summary += `\n🎯 Você tem ${dreams.count} sonho(s) ativo(s). Progresso geral: ${dreams.progress.toFixed(0)}%\n`;
  }

  // Conquistas
  if (achievements.completedCount > 0) {
    summary += `\n🏆 Você já conquistou ${achievements.completedCount} medalha(s)! Continue assim!\n`;
  }

  // Dica final
  summary += `\n💡 Dica do Dia: `;
  if (emergency.amount < user.salary * 3 && user.salary > 0) {
    summary += `Foque em construir sua reserva de emergência.`;
  } else if (investments.total === 0) {
    summary += `Comece a investir para construir seu patrimônio.`;
  } else if (loans.total > 0) {
    summary += `Priorize quitar suas dívidas para melhorar seu score.`;
  } else {
    summary += `Continue no caminho certo! Revise seus sonhos e planeje o próximo passo.`;
  }

  summary += `\n\n🐶 Estou aqui para te ajudar a alcançar seus objetivos!`;

  return summary;
}

module.exports = executiveController;