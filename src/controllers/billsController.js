const supabase = require('../db/supabase');

const billsController = {
  // GET - Listar contas
  async getBills(req, res) {
    console.log('🔵 GET BILLS - User:', req.userId);
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', req.userId);

      if (error) {
        console.log('🔴 Erro:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('🟢 Contas:', data?.length || 0);
      res.json({ data: data || [] });
    } catch (err) {
      console.log('🔴 Erro catch:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // POST - Criar conta (MÍNIMO)
  async createBill(req, res) {
    console.log('🔵🔵🔵 CREATE BILL RECEBIDO 🔵🔵🔵');
    console.log('Body:', req.body);
    console.log('User:', req.userId);
    
    try {
      const { name, value, due_day } = req.body;

      // Validação mínima
      if (!name || value === undefined || !due_day) {
        console.log('🔴 Campos faltando');
        return res.status(400).json({ error: 'Campos obrigatórios' });
      }

      // Inserir no Supabase
      const { data, error } = await supabase
        .from('bills')
        .insert({
          user_id: req.userId,
          name: name.trim(),
          value: parseFloat(value),
          due_day: parseInt(due_day),
          category: 'outros',
          status: 'pending'
        })
        .select();

      if (error) {
        console.log('🔴 Supabase error:', error);
        return res.status(500).json({ error: 'Supabase: ' + error.message });
      }

      console.log('🟢 Criado:', data);
      res.status(201).json(data?.[0] || {});
    } catch (err) {
      console.log('🔴 Erro catch:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // DELETE - Deletar conta
  async deleteBill(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('deleteBill error:', err);
      res.status(500).json({ error: 'Erro ao deletar conta' });
    }
  },

  // PUT - Atualizar status
  async updateBillStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const { data, error } = await supabase
        .from('bills')
        .update({ status, updated_at: new Date() })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('updateBillStatus error:', err);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  // GET - Dashboard
  async getDashboardSummary(req, res) {
    try {
      const { data: bills } = await supabase
        .from('bills')
        .select('value, status, due_day')
        .eq('user_id', req.userId);

      const { data: user } = await supabase
        .from('users')
        .select('salary')
        .eq('id', req.userId)
        .single();

      const salary = user?.salary || 0;
      const today = new Date().getDate();
      const allBills = bills || [];

      const paid = allBills.filter(b => b.status === 'paid');
      const pending = allBills.filter(b => b.status === 'pending' && b.due_day >= today);
      const late = allBills.filter(b => b.status === 'late' || (b.status === 'pending' && b.due_day < today));
      
      const totalPaid = paid.reduce((s, b) => s + (b.value || 0), 0);
      const totalCommitted = allBills.reduce((s, b) => s + (b.value || 0), 0);

      res.json({
        salary,
        totalBills: allBills.length,
        paidBills: paid.length,
        pendingBills: pending.length,
        lateBills: late.length,
        totalPaid,
        freeBalance: Math.max(0, salary - totalPaid),
        percentageCommitted: salary > 0 ? Math.round((totalCommitted / salary) * 100) : 0
      });
    } catch (err) {
      console.error('dashboard error:', err);
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }
};

module.exports = billsController;