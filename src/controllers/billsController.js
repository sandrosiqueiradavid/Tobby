const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

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

      const decryptedData = (data || []).map(bill => ({
        ...bill,
        value: decryptNumber(bill.value_encrypted),
        value_encrypted: undefined
      }));

      res.json({ data: decryptedData });
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

      const decryptedBill = {
        ...data,
        value: decryptNumber(data.value_encrypted),
        value_encrypted: undefined
      };

      res.json(decryptedBill);
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

      const encryptedValue = encryptNumber(value);

      const { data, error } = await supabase
        .from('tobby_bills')
        .insert({
          user_id: req.userId,
          name,
          value_encrypted: encryptedValue,
          due_day,
          category,
          status
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ ...data, value: value, value_encrypted: undefined });
    } catch (err) {
      console.error('Create bill error:', err);
      res.status(500).json({ error: 'Erro ao criar conta' });
    }
  },

  updateBill: async (req, res) => {
    try {
      const { name, value, due_day, category, status } = req.body;
      const updateData = { name, due_day, category, status, updated_at: new Date() };

      if (value !== undefined) {
        updateData.value_encrypted = encryptNumber(value);
      }

      const { data, error } = await supabase
        .from('tobby_bills')
        .update(updateData)
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) return res.status(404).json({ error: 'Conta não encontrada' });

      res.json({ ...data, value: value || decryptNumber(data.value_encrypted), value_encrypted: undefined });
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

      res.json({ ...data, value: decryptNumber(data.value_encrypted), value_encrypted: undefined });
    } catch (err) {
      console.error('Update bill status error:', err);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  getDashboardSummary: async (req, res) => {
    try {
      const { data: user } = await supabase
        .from('tobby_users')
        .select('salary_encrypted')
        .eq('id', req.userId)
        .single();

      const { data: bills, error } = await supabase
        .from('tobby_bills')
        .select('value_encrypted, status')
        .eq('user_id', req.userId);

      if (error) throw error;

      const salary = decryptNumber(user?.salary_encrypted) || 0;
      const today = new Date().getDate();
      const allBills = bills || [];

      const billsWithValues = allBills.map(b => ({
        ...b,
        value: decryptNumber(b.value_encrypted)
      }));

      const paid = billsWithValues.filter(b => b.status === 'paid');
      const pending = billsWithValues.filter(b => b.status === 'pending' && b.due_day >= today);
      const late = billsWithValues.filter(b => b.status === 'late' || (b.status === 'pending' && b.due_day < today));
      const totalPaid = paid.reduce((s, b) => s + b.value, 0);
      const totalCommitted = billsWithValues.reduce((s, b) => s + b.value, 0);

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
      console.error('Dashboard summary error:', err);
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }
};

module.exports = billsController;