// src/controllers/wealthController.js
const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../services/encryptionService');

const wealthController = {
  getWealthSummary: async (req, res) => {
    try {
      const { data: investments } = await supabase
        .from('investments')
        .select('quantity, purchase_price_encrypted')
        .eq('user_id', req.userId);

      const { data: loans } = await supabase
        .from('loans')
        .select('outstanding_balance_encrypted')
        .eq('user_id', req.userId);

      const { data: assets } = await supabase
        .from('assets')
        .select('estimated_value_encrypted')
        .eq('user_id', req.userId);

      const { data: user } = await supabase
        .from('users')
        .select('salary_encrypted')
        .eq('id', req.userId)
        .single();

      const investmentsValue = investments?.reduce((sum, inv) => sum + (inv.quantity * decryptNumber(inv.purchase_price_encrypted)), 0) || 0;
      const loansValue = loans?.reduce((sum, loan) => sum + decryptNumber(loan.outstanding_balance_encrypted), 0) || 0;
      const assetsValue = assets?.reduce((sum, asset) => sum + decryptNumber(asset.estimated_value_encrypted), 0) || 0;
      const salary = decryptNumber(user?.salary_encrypted) || 0;

      const totalAssets = investmentsValue + assetsValue + salary;
      const totalLiabilities = loansValue;
      const netWorth = totalAssets - totalLiabilities;

      res.json({
        summary: {
          totalAssets,
          totalLiabilities,
          netWorth,
          investmentsValue,
          loansValue,
          assetsValue,
          monthlyIncome: salary
        },
        recommendations: []
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
        .order('estimated_value_encrypted', { ascending: false });

      if (error) throw error;

      const decryptedAssets = (data || []).map(asset => ({
        ...asset,
        estimated_value: decryptNumber(asset.estimated_value_encrypted),
        acquisition_value: decryptNumber(asset.acquisition_value_encrypted),
        estimated_value_encrypted: undefined,
        acquisition_value_encrypted: undefined
      }));

      res.json({ assets: decryptedAssets });
    } catch (err) {
      console.error('Get assets error:', err);
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
          estimated_value_encrypted: encryptNumber(estimatedValue)
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ ...data, estimated_value: estimatedValue });
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
      console.error('Delete asset error:', err);
      res.status(500).json({ error: 'Erro ao deletar bem' });
    }
  }
};

module.exports = wealthController;