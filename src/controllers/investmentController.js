// src/controllers/investmentController.js
const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../services/encryptionService');

const investmentController = {
  // ===== LISTAR INVESTIMENTOS =====
  getInvestments: async (req, res) => {
    try {
      const { data: investments, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', req.userId)
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      const decryptedInvestments = (investments || []).map(inv => ({
        ...inv,
        purchase_price: decryptNumber(inv.purchase_price_encrypted),
        current_price: decryptNumber(inv.current_price_encrypted),
        purchase_price_encrypted: undefined,
        current_price_encrypted: undefined
      }));

      const totalInvested = decryptedInvestments.reduce((sum, inv) => sum + (inv.quantity * inv.purchase_price), 0);
      const totalCurrent = decryptedInvestments.reduce((sum, inv) => sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0);
      const totalProfitLoss = totalCurrent - totalInvested;
      const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

      res.json({
        investments: decryptedInvestments,
        summary: { totalInvested, totalCurrent, totalProfitLoss, totalProfitLossPercent }
      });
    } catch (err) {
      console.error('Get investments error:', err);
      res.status(500).json({ error: 'Erro ao buscar investimentos' });
    }
  },

  // ===== CRIAR INVESTIMENTO =====
  createInvestment: async (req, res) => {
    try {
      const { symbol, quantity, purchasePrice, purchaseDate, assetType, broker } = req.body;

      if (!symbol || !quantity || !purchasePrice || !purchaseDate) {
        return res.status(400).json({ error: 'Símbolo, quantidade, preço e data são obrigatórios' });
      }

      const encryptedPrice = encryptNumber(purchasePrice);

      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: req.userId,
          symbol: symbol.toUpperCase(),
          quantity,
          purchase_price_encrypted: encryptedPrice,
          purchase_date: purchaseDate,
          asset_type: assetType || 'stock',
          broker: broker || null
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ 
        ...data, 
        purchase_price: purchasePrice, 
        purchase_price_encrypted: undefined 
      });
    } catch (err) {
      console.error('Create investment error:', err);
      res.status(500).json({ error: 'Erro ao cadastrar investimento' });
    }
  },

  // ===== ATUALIZAR PREÇO DO INVESTIMENTO =====
  updateInvestmentPrice: async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPrice } = req.body;

      if (currentPrice === undefined || currentPrice === null) {
        return res.status(400).json({ error: 'Preço atual é obrigatório' });
      }

      const numPrice = parseFloat(currentPrice);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({ error: 'Preço deve ser um número positivo' });
      }

      const encryptedPrice = encryptNumber(numPrice);

      const { data, error } = await supabase
        .from('investments')
        .update({ 
          current_price_encrypted: encryptedPrice, 
          updated_at: new Date() 
        })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Investimento não encontrado' });
        }
        throw error;
      }

      res.json({ 
        ...data, 
        current_price: numPrice, 
        current_price_encrypted: undefined 
      });
    } catch (err) {
      console.error('Update investment price error:', err);
      res.status(500).json({ error: 'Erro ao atualizar preço' });
    }
  },

  // ===== DELETAR INVESTIMENTO =====
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
      console.error('Delete investment error:', err);
      res.status(500).json({ error: 'Erro ao deletar investimento' });
    }
  }
};

module.exports = investmentController;