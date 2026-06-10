const supabase = require('../db/supabase');

const billsController = {
  getBills: async (req, res) => {
    try {
      const { status } = req.query;
      let query = supabase
        .from('bills')
        .select('*')
        .eq('user_id', req.userId)
        .order('due_day', { ascending: true });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao listar contas' });
    }
  },

  getBill: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .single();
      if (error) return res.status(404).json({ error: 'Conta não encontrada' });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar conta' });
    }
  },

  createBill: async (req, res) => {
    try {
      const { name, value, due_day, category = 'outros', status = 'pending' } = req.body;
      if (!name || !value || !due_day) {
        return res.status(400).json({ error: 'Nome, valor e dia de vencimento são obrigatórios' });
      }

      const { data, error } = await supabase
        .from('bills')
        .insert({ user_id: req.userId, name, value, due_day, category, status })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao criar conta' });
    }
  },

  updateBill: async (req, res) => {
    try {
      const { name, value, due_day, category, status } = req.body;
      const { data, error } = await supabase
        .from('bills')
        .update({ name, value, due_day, category, status, updated_at: new Date() })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();
      if (error) return res.status(404).json({ error: 'Conta não encontrada' });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  },

  deleteBill: async (req, res) => {
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.userId);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao deletar conta' });
    }
  },

  updateBillStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (!['pending', 'paid', 'late'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const { data, error } = await supabase
        .from('bills')
        .update({ status, updated_at: new Date() })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();
      if (error) return res.status(404).json({ error: 'Conta não encontrada' });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  getDashboardSummary: async (req, res) => {
    try {
      const { data: user } = await supabase
        .from('users').select('salary').eq('id', req.userId).single();
      const { data: bills } = await supabase
        .from('bills').select('*').eq('user_id', req.userId);

      const salary = user?.salary || 0;
      const today = new Date().getDate();
      const allBills = bills || [];

      const paid = allBills.filter(b => b.status === 'paid');
      const pending = allBills.filter(b => b.status === 'pending' && b.due_day >= today);
      const late = allBills.filter(b => b.status === 'late' || (b.status === 'pending' && b.due_day < today));
      const totalOut = paid.reduce((s, b) => s + parseFloat(b.value), 0);
      const totalCommitted = allBills.reduce((s, b) => s + parseFloat(b.value), 0);

      res.json({
        salary,
        totalBills: allBills.length,
        paidBills: paid.length,
        pendingBills: pending.length,
        lateBills: late.length,
        totalPaid: totalOut,
        freeBalance: Math.max(0, salary - totalOut),
        percentageCommitted: salary > 0 ? Math.round((totalCommitted / salary) * 100) : 0
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }
};

module.exports = billsController;