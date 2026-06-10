const supabase = require('../db/supabase');

const investmentController = {
  getInvestments: async (req, res) => {
    try {
      const { data: investments, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', req.userId)
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      const totalInvested = investments.reduce((sum, inv) => sum + (inv.quantity * inv.purchase_price), 0);
      const totalCurrent = investments.reduce((sum, inv) => sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0);
      const totalProfitLoss = totalCurrent - totalInvested;
      const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

      res.json({
        investments,
        summary: {
          totalInvested,
          totalCurrent,
          totalProfitLoss,
          totalProfitLossPercent
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar investimentos' });
    }
  },

  createInvestment: async (req, res) => {
    try {
      const { symbol, quantity, purchasePrice, purchaseDate, assetType, broker } = req.body;
      
      if (!symbol || !quantity || !purchasePrice || !purchaseDate) {
        return res.status(400).json({ error: 'Símbolo, quantidade, preço e data são obrigatórios' });
      }

      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: req.userId,
          symbol: symbol.toUpperCase(),
          quantity,
          purchase_price: purchasePrice,
          purchase_date: purchaseDate,
          asset_type: assetType || 'stock',
          broker: broker || null
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Create investment error:', err);
      res.status(500).json({ error: 'Erro ao cadastrar investimento' });
    }
  },

  deleteInvestment: async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao deletar investimento' });
    }
  }
};

module.exports = investmentController;