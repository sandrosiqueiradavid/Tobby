const supabase = require('../db/supabase');

const billsController = {
  // ===== LISTAR CONTAS =====
  async getBills(req, res) {
    try {
      console.log('[BILLS] Listando contas para:', req.userId);
      
      const { status } = req.query;
      let query = supabase
        .from('bills')
        .select('*')
        .eq('user_id', req.userId)
        .order('due_day', { ascending: true });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;

      res.json({ data: data || [] });
    } catch (err) {
      console.error('[BILLS] getBills error:', err);
      res.status(500).json({ error: 'Erro ao listar contas' });
    }
  },

  // ===== CRIAR CONTA =====
  async createBill(req, res) {
    try {
      console.log('[BILLS] Criando conta:', req.body);
      
      const { name, value, due_day, category = 'outros', status = 'pending' } = req.body;

      if (!name || value === undefined || !due_day) {
        return res.status(400).json({ error: 'Nome, valor e dia de vencimento são obrigatórios' });
      }

      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        return res.status(400).json({ error: 'Valor inválido' });
      }

      if (due_day < 1 || due_day > 31) {
        return res.status(400).json({ error: 'Dia de vencimento deve ser entre 1 e 31' });
      }

      const { data, error } = await supabase
        .from('bills')
        .insert({
          user_id: req.userId,
          name: name.trim(),
          value: numValue,
          due_day: due_day,
          category: category,
          status: status
        })
        .select()
        .single();

      if (error) {
        console.error('[BILLS] Supabase error:', error);
        return res.status(500).json({ error: 'Erro ao salvar: ' + error.message });
      }

      console.log('[BILLS] Conta criada:', data.id);
      res.status(201).json(data);
    } catch (err) {
      console.error('[BILLS] createBill error:', err);
      res.status(500).json({ error: 'Erro ao criar conta' });
    }
  },

  // ===== BUSCAR UMA CONTA =====
  async getBill(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }
        throw error;
      }

      res.json(data);
    } catch (err) {
      console.error('[BILLS] getBill error:', err);
      res.status(500).json({ error: 'Erro ao buscar conta' });
    }
  },

  // ===== ATUALIZAR CONTA =====
  async updateBill(req, res) {
    try {
      const { id } = req.params;
      const { name, value, due_day, category, status } = req.body;

      const updateData = { updated_at: new Date() };
      if (name !== undefined) updateData.name = name.trim();
      if (due_day !== undefined) updateData.due_day = due_day;
      if (category !== undefined) updateData.category = category;
      if (status !== undefined) updateData.status = status;

      if (value !== undefined) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          return res.status(400).json({ error: 'Valor inválido' });
        }
        updateData.value = numValue;
      }

      const { data, error } = await supabase
        .from('bills')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }
        throw error;
      }

      res.json(data);
    } catch (err) {
      console.error('[BILLS] updateBill error:', err);
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  },

  // ===== DELETAR CONTA =====
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
      console.error('[BILLS] deleteBill error:', err);
      res.status(500).json({ error: 'Erro ao deletar conta' });
    }
  },

  // ===== ATUALIZAR STATUS =====
  async updateBillStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'paid', 'late'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const { data, error } = await supabase
        .from('bills')
        .update({ status, updated_at: new Date() })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }
        throw error;
      }

      res.json(data);
    } catch (err) {
      console.error('[BILLS] updateBillStatus error:', err);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  // ===== DASHBOARD =====
  async getDashboardSummary(req, res) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('salary')
        .eq('id', req.userId)
        .single();

      const { data: bills } = await supabase
        .from('bills')
        .select('value, status, due_day')
        .eq('user_id', req.userId);

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
      console.error('[BILLS] dashboard error:', err);
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }
};

module.exports = billsController;