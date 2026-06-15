const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const billsController = {
  async getBills(req, res) {
    try {
      console.log('[BILLS] Listando contas para usuário:', req.userId);
      
      const { status } = req.query;
      let query = supabase
        .from('bills')
        .select('*')
        .eq('user_id', req.userId)
        .order('due_day', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[BILLS] Erro Supabase:', error);
        throw error;
      }

      const decryptedData = (data || []).map(bill => {
        let value = 0;
        try {
          value = decryptNumber(bill.value_encrypted);
          if (isNaN(value)) value = 0;
        } catch (e) {
          console.error(`[BILLS] Erro descriptografar conta ${bill.id}:`, e);
          value = 0;
        }
        return {
          id: bill.id,
          name: bill.name,
          value: value,
          due_day: bill.due_day,
          category: bill.category,
          status: bill.status,
          created_at: bill.created_at,
          updated_at: bill.updated_at
        };
      });

      console.log(`[BILLS] ${decryptedData.length} contas encontradas`);
      res.json({ data: decryptedData });
    } catch (err) {
      console.error('[BILLS] Erro getBills:', err);
      res.status(500).json({ error: 'Erro ao listar contas: ' + err.message });
    }
  },

  async getBill(req, res) {
    try {
      const { id } = req.params;
      console.log('[BILLS] Buscando conta:', id);

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

      const value = decryptNumber(data.value_encrypted);
      
      res.json({
        id: data.id,
        name: data.name,
        value: value,
        due_day: data.due_day,
        category: data.category,
        status: data.status,
        created_at: data.created_at
      });
    } catch (err) {
      console.error('[BILLS] Erro getBill:', err);
      res.status(500).json({ error: 'Erro ao buscar conta' });
    }
  },

  async createBill(req, res) {
    try {
      const { name, value, due_day, category = 'outros', status = 'pending' } = req.body;
      
      console.log('[BILLS] Criando conta:', { name, value, due_day, category, userId: req.userId });

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

      const encryptedValue = encryptNumber(numValue);
      if (!encryptedValue) {
        console.error('[BILLS] Falha na criptografia do valor');
        return res.status(500).json({ error: 'Erro ao processar valor' });
      }

      const { data, error } = await supabase
        .from('bills')
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

      if (error) {
        console.error('[BILLS] Erro Supabase insert:', error);
        throw error;
      }

      console.log('[BILLS] Conta criada com sucesso:', data.id);
      
      res.status(201).json({
        id: data.id,
        name: data.name,
        value: numValue,
        due_day: data.due_day,
        category: data.category,
        status: data.status,
        created_at: data.created_at
      });
    } catch (err) {
      console.error('[BILLS] Erro createBill:', err);
      res.status(500).json({ error: 'Erro ao criar conta: ' + err.message });
    }
  },

  async updateBill(req, res) {
    try {
      const { id } = req.params;
      const { name, value, due_day, category, status } = req.body;
      
      console.log('[BILLS] Atualizando conta:', id);

      const updateData = { name, due_day, category, status, updated_at: new Date() };
      
      if (value !== undefined) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return res.status(400).json({ error: 'Valor inválido' });
        }
        const encryptedValue = encryptNumber(numValue);
        if (!encryptedValue) {
          return res.status(500).json({ error: 'Erro ao processar valor' });
        }
        updateData.value_encrypted = encryptedValue;
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

      const finalValue = value !== undefined ? value : decryptNumber(data.value_encrypted);
      
      res.json({
        id: data.id,
        name: data.name,
        value: finalValue,
        due_day: data.due_day,
        category: data.category,
        status: data.status
      });
    } catch (err) {
      console.error('[BILLS] Erro updateBill:', err);
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  },

  async deleteBill(req, res) {
    try {
      const { id } = req.params;
      console.log('[BILLS] Deletando conta:', id);

      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) throw error;

      res.json({ success: true });
    } catch (err) {
      console.error('[BILLS] Erro deleteBill:', err);
      res.status(500).json({ error: 'Erro ao deletar conta' });
    }
  },

  async updateBillStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      console.log('[BILLS] Atualizando status:', id, '->', status);

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

      const value = decryptNumber(data.value_encrypted);
      
      res.json({
        id: data.id,
        name: data.name,
        value: value,
        due_day: data.due_day,
        category: data.category,
        status: data.status
      });
    } catch (err) {
      console.error('[BILLS] Erro updateBillStatus:', err);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  async getDashboardSummary(req, res) {
    try {
      console.log('[BILLS] Buscando dashboard para:', req.userId);
      
      const { data: user } = await supabase
        .from('users')
        .select('salary_encrypted')
        .eq('id', req.userId)
        .single();

      const { data: bills, error } = await supabase
        .from('bills')
        .select('value_encrypted, status, due_day')
        .eq('user_id', req.userId);

      if (error) throw error;

      let salary = 0;
      if (user?.salary_encrypted) {
        salary = decryptNumber(user.salary_encrypted);
        if (isNaN(salary)) salary = 0;
      }

      const today = new Date().getDate();
      const allBills = (bills || []).map(b => ({
        ...b,
        value: decryptNumber(b.value_encrypted) || 0
      }));

      const paid = allBills.filter(b => b.status === 'paid');
      const pending = allBills.filter(b => b.status === 'pending' && b.due_day >= today);
      const late = allBills.filter(b => b.status === 'late' || (b.status === 'pending' && b.due_day < today));
      
      const totalPaid = paid.reduce((s, b) => s + b.value, 0);
      const totalCommitted = allBills.reduce((s, b) => s + b.value, 0);
      const freeBalance = salary - totalPaid;
      const percentageCommitted = salary > 0 ? Math.round((totalCommitted / salary) * 100) : 0;

      res.json({
        salary,
        totalBills: allBills.length,
        paidBills: paid.length,
        pendingBills: pending.length,
        lateBills: late.length,
        totalPaid,
        freeBalance: Math.max(0, freeBalance),
        percentageCommitted
      });
    } catch (err) {
      console.error('[BILLS] Erro dashboard:', err);
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }
};

module.exports = billsController;