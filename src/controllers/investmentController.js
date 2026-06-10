const supabase = require('../db/supabase');

// API gratuita para cotações (Brasil)
const BR_API_URL = 'https://brapi.dev/api/quote/';

const investmentController = {
  // Cadastrar novo investimento
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

      // Buscar cotação atual
      const quote = await getCurrentPrice(symbol.toUpperCase());
      
      if (quote) {
        data.current_price = quote.currentPrice;
        data.variation = ((quote.currentPrice - purchasePrice) / purchasePrice) * 100;
      }

      res.status(201).json(data);
    } catch (err) {
      console.error('Create investment error:', err);
      res.status(500).json({ error: 'Erro ao cadastrar investimento' });
    }
  },

  // Listar investimentos com cotações atualizadas
  getInvestments: async (req, res) => {
    try {
      const { data: investments, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', req.userId)
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      // Atualizar cotações em lote
      const symbols = investments.map(inv => inv.symbol).filter((v,i,a) => a.indexOf(v) === i);
      const quotes = await getBatchPrices(symbols);
      
      const enrichedInvestments = investments.map(inv => {
        const quote = quotes[inv.symbol];
        const currentValue = quote ? inv.quantity * quote.currentPrice : inv.quantity * inv.purchase_price;
        const investedValue = inv.quantity * inv.purchase_price;
        
        return {
          ...inv,
          current_price: quote?.currentPrice || null,
          variation: quote ? ((quote.currentPrice - inv.purchase_price) / inv.purchase_price) * 100 : null,
          current_value: currentValue,
          invested_value: investedValue,
          profit_loss: currentValue - investedValue,
          profit_loss_percent: investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0
        };
      });

      // Resumo da carteira
      const summary = {
        totalInvested: enrichedInvestments.reduce((sum, inv) => sum + inv.invested_value, 0),
        totalCurrent: enrichedInvestments.reduce((sum, inv) => sum + inv.current_value, 0),
        totalProfitLoss: enrichedInvestments.reduce((sum, inv) => sum + inv.profit_loss, 0),
        totalProfitLossPercent: enrichedInvestments.reduce((sum, inv) => sum + inv.profit_loss_percent, 0) / (enrichedInvestments.length || 1),
        byType: {}
      };

      enrichedInvestments.forEach(inv => {
        if (!summary.byType[inv.asset_type]) {
          summary.byType[inv.asset_type] = { invested: 0, current: 0, profit: 0 };
        }
        summary.byType[inv.asset_type].invested += inv.invested_value;
        summary.byType[inv.asset_type].current += inv.current_value;
        summary.byType[inv.asset_type].profit += inv.profit_loss;
      });

      res.json({ investments: enrichedInvestments, summary, lastUpdate: new Date() });
    } catch (err) {
      console.error('Get investments error:', err);
      res.status(500).json({ error: 'Erro ao buscar investimentos' });
    }
  },

  // Atualizar investimento (venda, compra adicional)
  updateInvestment: async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, purchasePrice, operation } = req.body;

      const { data: existing } = await supabase
        .from('investments')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (!existing) {
        return res.status(404).json({ error: 'Investimento não encontrado' });
      }

      let newQuantity = existing.quantity;
      let newAveragePrice = existing.purchase_price;

      if (operation === 'buy') {
        // Compra adicional - recalcular preço médio
        const totalInvested = (existing.quantity * existing.purchase_price) + (quantity * purchasePrice);
        newQuantity = existing.quantity + quantity;
        newAveragePrice = totalInvested / newQuantity;
      } else if (operation === 'sell') {
        // Venda parcial ou total
        newQuantity = existing.quantity - quantity;
        if (newQuantity <= 0) {
          // Remover investimento
          await supabase.from('investments').delete().eq('id', id);
          return res.json({ message: 'Investimento removido com sucesso' });
        }
      }

      const { data, error } = await supabase
        .from('investments')
        .update({
          quantity: newQuantity,
          purchase_price: newAveragePrice,
          updated_at: new Date()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Update investment error:', err);
      res.status(500).json({ error: 'Erro ao atualizar investimento' });
    }
  },

  // Deletar investimento
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

// Funções auxiliares para API de cotações
async function getCurrentPrice(symbol) {
  try {
    const response = await fetch(`${BR_API_URL}${symbol}`);
    const data = await response.json();
    if (data.results && data.results[0]) {
      return {
        currentPrice: data.results[0].regularMarketPrice,
        change: data.results[0].regularMarketChange,
        changePercent: data.results[0].regularMarketChangePercent
      };
    }
    return null;
  } catch (err) {
    console.error('Price fetch error:', err);
    return null;
  }
}

async function getBatchPrices(symbols) {
  const quotes = {};
  for (const symbol of symbols.slice(0, 10)) { // Limitar a 10 por vez
    const quote = await getCurrentPrice(symbol);
    if (quote) quotes[symbol] = quote;
  }
  return quotes;
}

module.exports = investmentController;