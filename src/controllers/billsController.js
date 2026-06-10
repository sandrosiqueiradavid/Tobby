const supabase = require('../db/supabase');

const billsController = {
  getBills: async (req, res) => {
    try {
      const { status } = req.query;
      let query = supabase
        .from('tobby_bills')
        .select('*')
        .eq('user_id', req.userId)
        .order('due_day', { ascending: true });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      
      res.json({ data: data || [] });
    } catch (err) {
      console.error('Get bills error:', err);
      res.status(500).json({ error: 'Erro ao listar contas' });
    }
  },

  getBill: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('tobby_bills')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .single();
        
      if (error) return res.status(404).json({ error: 'Conta não encontrada' });
      res.json(data);
    } catch (err) {
      console.error('Get bill error:', err);
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
        .from('tobby_bills')
        .insert({ 
          user_id: req.userId, 
          name, 
          value, 
          due_day, 
          category, 
          status 
        })
        .select()
        .single();
        
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Create bill error:', err);
      res.status(500).json({ error: 'Erro ao criar conta' });
    }
  },

  updateBill: async (req, res) => {
    try {
      const { name, value, due_day, category, status } = req.body;
      
      const { data, error } = await supabase
        .from('tobby_bills')
        .update({ 
          name, 
          value, 
          due_day, 
          category, 
          status, 
          updated_at: new Date() 
        })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();
        
      if (error) return res.status(404).json({ error: 'Conta não encontrada' });
      res.json(data);
    } catch (err) {
      console.error('Update bill error:', err);
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  },

  deleteBill: async (req, res) => {
    try {
      const { error } = await supabase
        .from('tobby_bills')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.userId);
        
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('Delete bill error:', err);
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
        .from('tobby_bills')
        .update({ status, updated_at: new Date() })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();
        
      if (error) return res.status(404).json({ error: 'Conta não encontrada' });
      res.json(data);
    } catch (err) {
      console.error('Update bill status error:', err);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  getDashboardSummary: async (req, res) => {
    try {
      // Buscar salário do usuário
      const { data: user } = await supabase
        .from('tobby_users')
        .select('salary')
        .eq('id', req.userId)
        .single();

      // Buscar todas as contas do usuário
      const { data: bills, error } = await supabase
        .from('tobby_bills')
        .select('*')
        .eq('user_id', req.userId);

      if (error) throw error;

      const salary = user?.salary || 0;
      const today = new Date().getDate();
      const allBills = bills || [];

      const paid = allBills.filter(b => b.status === 'paid');
      const pending = allBills.filter(b => b.status === 'pending' && b.due_day >= today);
      const late = allBills.filter(b => b.status === 'late' || (b.status === 'pending' && b.due_day < today));
      const totalPaid = paid.reduce((s, b) => s + parseFloat(b.value), 0);
      const totalCommitted = allBills.reduce((s, b) => s + parseFloat(b.value), 0);

      res.json({
        salary: parseFloat(salary),
        totalBills: allBills.length,
        paidBills: paid.length,
        pendingBills: pending.length,
        lateBills: late.length,
        totalPaid: parseFloat(totalPaid),
        freeBalance: Math.max(0, salary - totalPaid),
        percentageCommitted: salary > 0 ? Math.round((totalCommitted / salary) * 100) : 0
      });
    } catch (err) {
      console.error('Dashboard summary error:', err);
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }
};

module.exports = billsController;