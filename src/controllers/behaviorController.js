const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');

const behaviorController = {
  // ===== LISTAR ALERTAS =====
  async getAlerts(req, res) {
    try {
      const { is_read } = req.query;
      let query = supabase
        .from('behavior_alerts')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });

      if (is_read !== undefined) query = query.eq('is_read', is_read === 'true');

      const { data, error } = await query;
      if (error) throw error;

      res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('Behavior alerts error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== MARCAR COMO LIDO =====
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('behavior_alerts')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error('Mark alert read error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== ANALISAR COMPORTAMENTO (JOB) =====
  async analyzeBehavior(req, res) {
    try {
      const userId = req.userId || req.query.userId;
      
      // Buscar contas dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (!bills || bills.length === 0) {
        return res.json({ success: true, message: 'Sem dados suficientes para análise' });
      }

      // Analisar categorias
      const categorySpending = {};
      bills.forEach(bill => {
        const value = decryptNumber(bill.value_encrypted) || 0;
        const cat = bill.category || 'outros';
        categorySpending[cat] = (categorySpending[cat] || 0) + value;
      });

      // Identificar maiores gastos
      const sorted = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
      const alerts = [];

      // Gerar alertas
      if (sorted.length > 0 && sorted[0][1] > 500) {
        alerts.push({
          user_id: userId,
          alert_type: 'high_spending',
          title: `⚠️ Alto gasto em ${sorted[0][0]}`,
          description: `Você gastou R$ ${sorted[0][1].toFixed(2)} em ${sorted[0][0]} nos últimos 30 dias.`,
          severity: 'warning'
        });
      }

      // Salvar alertas
      if (alerts.length > 0) {
        await supabase.from('behavior_alerts').insert(alerts);
      }

      res.json({ 
        success: true, 
        alerts_generated: alerts.length,
        analysis: { categorySpending, topCategory: sorted[0]?.[0] || 'Nenhum' }
      });
    } catch (err) {
      console.error('Behavior analysis error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = behaviorController;