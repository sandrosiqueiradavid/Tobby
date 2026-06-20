const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const billsController = {
  // ===== LISTAR CONTAS =====
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
        return res.status(500).json({ error: 'Erro ao buscar contas no banco' });
      }

      const decryptedData = (data || []).map(bill => {
        let value = 0;
        try {
          value = decryptNumber(bill.value_encrypted);
          if (isNaN(value) || value === null || value === undefined) value = 0;
        } catch (e) {
          console.error(`[BILLS] Erro descriptografar conta ${bill.id}:`, e.message);
          value = 0;
        }
        return {
          id: bill.id,
          user_id: bill.user_id,
          name: bill.name,
          value: value,
          due_day: bill.due_day,
          category: bill.category || 'outros',
          status: bill.status || 'pending',
          created_at: bill.created_at,
          updated_at: bill.updated_at
        };
      });

      console.log(`[BILLS] ${decryptedData.length} contas encontradas`);
      res.json({ data: decryptedData });
    } catch (err) {
      console.error('[BILLS] Erro getBills:', err);
      res.status(500).json({ error: 'Erro ao listar contas' });
    }
  },

  // ===== CRIAR CONTA (CORRIGIDO COM FALLBACK) =====
  async createBill(req, res) {
    try {
      const { name, value, due_day, category = 'outros', status = 'pending' } = req.body;
      
      console.log('[BILLS] Criando conta:', { name, value, due_day, category, userId: req.userId });

      // VALIDAÇÕES
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

      // CRIPTOGRAFAR COM FALLBACK
      let encryptedValue = encryptNumber(numValue);
      
      // Se a criptografia falhar, usar fallback
      if (!encryptedValue) {
        console.warn('[BILLS] ⚠️ Criptografia falhou, usando fallback com valor em texto');
        encryptedValue = `plain:${numValue}`;
      }

      // INSERIR NO SUPABASE
      const { data, error } = await supabase
        .from('bills')
        .insert({
          user_id: req.userId,
          name: name.trim(),
          value_encrypted: encryptedValue,
          due_day: due_day,
          category: category,
          status: status
        })
        .select()
        .single();

      if (error) {
        console.error('[BILLS] Erro Supabase insert:', error);
        return res.status(500).json({ error: 'Erro ao salvar conta no banco: ' + error.message });
      }

      console.log('[BILLS] ✅ Conta criada com sucesso:', data.id);
      
      res.status(201).json({
        id: data.id,
        name: data.name,
        value: numValue,
        due_day: data.due_day,
        category: data.category || 'outros',
        status: data.status || 'pending',
        created_at: data.created_at
      });
    } catch (err) {
      console.error('[BILLS] ❌ Erro createBill:', err);
      res.status(500).json({ error: 'Erro ao criar conta: ' + err.message });
    }
  },

  // ===== BUSCAR UMA CONTA =====
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

      let value = 0;
      try {
        value = decryptNumber(data.value_encrypted);
        if (isNaN(value) || value === null || value === undefined) value = 0;
      } catch (e) {
        console.error(`[BILLS] Erro descriptografar ${id}:`, e.message);
        value = 0;
      }

      res.json({
        id: data.id,
        name: data.name,
        value: value,
        due_day: data.due_day,
        category: data.category || 'outros',
        status: data.status || 'pending',
        created_at: data.created_at
      });
    } catch (err) {
      console.error('[BILLS] Erro getBill:', err);
      res.status(500).json({ error: 'Erro ao buscar conta' });
    }
  },

  // ===== ATUALIZAR CONTA =====
  async updateBill(req, res) {
    try {
      const { id } = req.params;
      const { name, value, due_day, category, status } = req.body;
      
      console.log('[BILLS] Atualizando conta:', id);

      const { data: existing, error: findError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (findError || !existing) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

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
        let encryptedValue = encryptNumber(numValue);
        if (!encryptedValue) {
          encryptedValue = `plain:${numValue}`;
          console.warn('[BILLS] ⚠️ Criptografia falhou, usando fallback');
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
        console.error('[BILLS] Erro update:', error);
        return res.status(500).json({ error: 'Erro ao atualizar conta' });
      }

      let finalValue = 0;
      try {
        finalValue = decryptNumber(data.value_encrypted);
        if (isNaN(finalValue) || finalValue === null || finalValue === undefined) finalValue = 0;
      } catch (e) {
        finalValue = 0;
      }

      res.json({
        id: data.id,
        name: data.name,
        value: finalValue,
        due_day: data.due_day,
        category: data.category || 'outros',
        status: data.status || 'pending'
      });
    } catch (err) {
      console.error('[BILLS] Erro updateBill:', err);
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  },

  // ===== DELETAR CONTA =====
  async deleteBill(req, res) {
    try {
      const { id } = req.params;
      console.log('[BILLS] Deletando conta:', id);

      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) {
        console.error('[BILLS] Erro delete:', error);
        return res.status(500).json({ error: 'Erro ao deletar conta' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('[BILLS] Erro deleteBill:', err);
      res.status(500).json({ error: 'Erro ao deletar conta' });
    }
  },

  // ===== ATUALIZAR STATUS =====
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

      let value = 0;
      try {
        value = decryptNumber(data.value_encrypted);
        if (isNaN(value) || value === null || value === undefined) value = 0;
      } catch (e) {
        value = 0;
      }

      res.json({
        id: data.id,
        name: data.name,
        value: value,
        due_day: data.due_day,
        category: data.category || 'outros',
        status: data.status
      });
    } catch (err) {
      console.error('[BILLS] Erro updateBillStatus:', err);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  // ===== DASHBOARD =====
  async getDashboardSummary(req, res) {
    try {
      console.log('[BILLS] Dashboard para:', req.userId);
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('salary_encrypted')
        .eq('id', req.userId)
        .single();

      if (userError) {
        console.error('[BILLS] Erro buscar usuário:', userError);
        return res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
      }

      const { data: bills, error } = await supabase
        .from('bills')
        .select('value_encrypted, status, due_day')
        .eq('user_id', req.userId);

      if (error) {
        console.error('[BILLS] Erro buscar contas:', error);
        return res.status(500).json({ error: 'Erro ao buscar contas' });
      }

      let salary = 0;
      if (user?.salary_encrypted) {
        try {
          salary = decryptNumber(user.salary_encrypted);
          if (isNaN(salary) || salary === null || salary === undefined) salary = 0;
        } catch (e) {
          salary = 0;
        }
      }

      const today = new Date().getDate();
      const allBills = (bills || []).map(b => {
        let value = 0;
        try {
          value = decryptNumber(b.value_encrypted);
          if (isNaN(value) || value === null || value === undefined) value = 0;
        } catch (e) {
          value = 0;
        }
        return { ...b, value };
      });

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
        percentageCommitted: Math.min(100, percentageCommitted)
      });
    } catch (err) {
      console.error('[BILLS] Erro dashboard:', err);
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }
};

module.exports = billsController;