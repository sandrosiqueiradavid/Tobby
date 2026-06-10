const supabase = require('../db/supabase');

const wealthController = {
  getWealthSummary: async (req, res) => {
    try {
      const { data: investments } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', req.userId);

      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', req.userId);

      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', req.userId);

      const { data: user } = await supabase
        .from('users')
        .select('salary')
        .eq('id', req.userId)
        .single();

      const investmentsValue = investments?.reduce((sum, inv) => sum + (inv.quantity * inv.purchase_price), 0) || 0;
      const loansValue = loans?.reduce((sum, loan) => sum + loan.outstanding_balance, 0) || 0;
      const assetsValue = assets?.reduce((sum, asset) => sum + asset.estimated_value, 0) || 0;

      const totalAssets = investmentsValue + assetsValue + (user?.salary || 0);
      const totalLiabilities = loansValue;
      const netWorth = totalAssets - totalLiabilities;

      const recommendations = [];
      if (loansValue > netWorth * 0.5 && netWorth > 0) {
        recommendations.push({
          type: 'debt',
          priority: 'high',
          message: 'Suas dívidas representam mais de 50% do seu patrimônio. Priorize a quitação!',
          action: 'Ver dívidas'
        });
      }
      
      if (investmentsValue < netWorth * 0.2 && netWorth > 0) {
        recommendations.push({
          type: 'investment',
          priority: 'medium',
          message: 'Seus investimentos estão abaixo do ideal. Considere diversificar.',
          action: 'Ver investimentos'
        });
      }

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
        recommendations
      });
    } catch (err) {
      console.error('Wealth summary error:', err);
      res.status(500).json({ error: 'Erro ao calcular patrimônio' });
    }
  },

  getAssets: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', req.userId)
        .order('estimated_value', { ascending: false });

      if (error) throw error;
      res.json({ assets: data || [] });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar bens' });
    }
  },

  createAsset: async (req, res) => {
    try {
      const { name, assetType, estimatedValue } = req.body;

      if (!name || !estimatedValue) {
        return res.status(400).json({ error: 'Nome e valor são obrigatórios' });
      }

      const { data, error } = await supabase
        .from('assets')
        .insert({
          user_id: req.userId,
          name,
          asset_type: assetType || 'other',
          estimated_value: estimatedValue
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

module.exports = wealthController;