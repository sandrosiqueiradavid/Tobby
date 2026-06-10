const supabase = require('../db/supabase');

const wealthController = {
  // Obter patrimônio completo
  getWealthSummary: async (req, res) => {
    try {
      // Buscar investimentos
      const { data: investments } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', req.userId);

      // Buscar dívidas
      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', req.userId);

      // Buscar bens
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', req.userId);

      // Buscar salário e contas pagas (fluxo mensal)
      const { data: user } = await supabase
        .from('users')
        .select('salary')
        .eq('id', req.userId)
        .single();

      // Calcular valores
      const investmentsValue = investments?.reduce((sum, inv) => sum + (inv.quantity * inv.purchase_price), 0) || 0;
      const loansValue = loans?.reduce((sum, loan) => sum + loan.outstanding_balance, 0) || 0;
      const assetsValue = assets?.reduce((sum, asset) => sum + asset.estimated_value, 0) || 0;

      const totalAssets = investmentsValue + assetsValue + (user?.salary || 0);
      const totalLiabilities = loansValue;
      const netWorth = totalAssets - totalLiabilities;

      // Evolução mensal (simulada - em produção viria do histórico)
      const evolution = generateWealthEvolution(netWorth);

      res.json({
        summary: {
          totalAssets,
          totalLiabilities,
          netWorth,
          investmentsValue,
          loansValue,
          assetsValue,
          monthlyIncome: user?.salary || 0
        },
        evolution,
        recommendations: generateRecommendations(netWorth, loansValue, investmentsValue),
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Wealth summary error:', err);
      res.status(500).json({ error: 'Erro ao calcular patrimônio' });
    }
  },

  // Criar bem/ativo
  createAsset: async (req, res) => {
    try {
      const { name, assetType, estimatedValue, acquisitionValue, acquisitionDate } = req.body;

      const { data, error } = await supabase
        .from('assets')
        .insert({
          user_id: req.userId,
          name,
          asset_type: assetType,
          estimated_value: estimatedValue,
          acquisition_value: acquisitionValue || null,
          acquisition_date: acquisitionDate || null
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Create asset error:', err);
      res.status(500).json({ error: 'Erro ao cadastrar bem' });
    }
  },

  // Listar bens
  getAssets: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', req.userId)
        .order('estimated_value', { ascending: false });

      if (error) throw error;
      res.json({ assets: data });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar bens' });
    }
  },

  // Deletar bem
  deleteAsset: async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao deletar bem' });
    }
  }
};

function generateWealthEvolution(currentNetWorth) {
  const evolution = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    // Simulação - em produção, buscar do histórico real
    evolution.push({
      month: date.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }),
      netWorth: currentNetWorth * (0.8 + (i * 0.05))
    });
  }
  
  return evolution;
}

function generateRecommendations(netWorth, loansValue, investmentsValue) {
  const recommendations = [];
  
  if (loansValue > netWorth * 0.5) {
    recommendations.push({
      type: 'debt',
      priority: 'high',
      message: 'Suas dívidas representam mais de 50% do seu patrimônio. Priorize a quitação!',
      action: 'Simular amortização'
    });
  }
  
  if (investmentsValue < netWorth * 0.2 && netWorth > 0) {
    recommendations.push({
      type: 'investment',
      priority: 'medium',
      message: 'Seus investimentos estão abaixo do ideal. Considere diversificar.',
      action: 'Ver sugestões de investimento'
    });
  }
  
  return recommendations;
}

module.exports = wealthController;