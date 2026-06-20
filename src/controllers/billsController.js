const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const billsController = {
  // ===== LISTAR CONTAS =====
  async getBills(req, res) {
    try {
      console.log('[BILLS] 📋 Listando contas para usuário:', req.userId);
      
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
        console.error('[BILLS] ❌ Erro Supabase:', error);
        return res.status(500).json({ error: 'Erro ao buscar contas no banco' });
      }

      const decryptedData = (data || []).map(bill => {
        let value = 0;
        try {
          value = decryptNumber(bill.value_encrypted);
          if (isNaN(value) || value === null || value === undefined) value = 0;
        } catch (e) {
          console.error(`[BILLS] ⚠️ Erro descriptografar conta ${bill.id}:`, e.message);
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

      console.log(`[BILLS] ✅ ${decryptedData.length} contas encontradas`);
      res.json({ data: decryptedData });
    } catch (err) {
      console.error('[BILLS] ❌ Erro getBills:', err);
      res.status(500).json({ error: 'Erro ao listar contas' });
    }
  },

  // ===== CRIAR CONTA (COM LOGS DETALHADOS) =====
  async createBill(req, res) {
    try {
      console.log('[BILLS] ========================================');
      console.log('[BILLS] 🚀 INICIANDO CREATE BILL');
      console.log('[BILLS] ========================================');
      console.log('[BILLS] Headers:', req.headers);
      console.log('[BILLS] Body:', req.body);
      console.log('[BILLS] UserId:', req.userId);
      console.log('[BILLS] ========================================');
      
      const { name, value, due_day, category = 'outros', status = 'pending' } = req.body;
      
      console.log('[BILLS] 📊 Dados recebidos:');
      console.log('[BILLS]   name:', name);
      console.log('[BILLS]   value:', value);
      console.log('[BILLS]   due_day:', due_day);
      console.log('[BILLS]   category:', category);
      console.log('[BILLS]   status:', status);

      // ===== VALIDAÇÕES =====
      if (!name) {
        console.log('[BILLS] ❌ Nome faltando');
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      if (value === undefined || value === null) {
        console.log('[BILLS] ❌ Valor faltando');
        return res.status(400).json({ error: 'Valor é obrigatório' });
      }

      if (!due_day) {
        console.log('[BILLS] ❌ Dia de vencimento faltando');
        return res.status(400).json({ error: 'Dia de vencimento é obrigatório' });
      }

      const numValue = parseFloat(value);
      console.log('[BILLS] 🔢 Valor convertido:', numValue);
      
      if (isNaN(numValue) || numValue <= 0) {
        console.log('[BILLS] ❌ Valor inválido:', numValue);
        return res.status(400).json({ error: 'Valor inválido' });
      }

      if (due_day < 1 || due_day > 31) {
        console.log('[BILLS] ❌ Dia inválido:', due_day);
        return res.status(400).json({ error: 'Dia de vencimento deve ser entre 1 e 31' });
      }

      console.log('[BILLS] ✅ Validações OK');

      // ===== CRIPTOGRAFIA =====
      console.log('[BILLS] 🔐 Tentando criptografar valor:', numValue);
      let encryptedValue;
      try {
        encryptedValue = encryptNumber(numValue);
        console.log('[BILLS] 🔐 encryptNumber retornou:', encryptedValue ? '✅ Válido' : '❌ Nulo');
        if (encryptedValue) {
          console.log('[BILLS] 🔐 Valor criptografado (início):', encryptedValue.substring(0, 30) + '...');
        }
      } catch (e) {
        console.error('[BILLS] ❌ Erro na criptografia:', e.message);
        console.error('[BILLS] Stack:', e.stack);
        encryptedValue = `plain:${numValue}`;
        console.log('[BILLS] 🔐 Usando fallback plain');
      }

      if (!encryptedValue) {
        console.log('[BILLS] ⚠️ encryptedValue é nulo, usando fallback');
        encryptedValue = `plain:${numValue}`;
      }

      console.log('[BILLS] 🔐 Valor final a salvar:', encryptedValue.substring(0, 30) + '...');

      // ===== INSERIR NO SUPABASE =====
      console.log('[BILLS] 💾 Inserindo no Supabase...');
      const insertData = {
        user_id: req.userId,
        name: name.trim(),
        value_encrypted: encryptedValue,
        due_day: due_day,
        category: category,
        status: status
      };
      console.log('[BILLS] 📦 Dados para insert:', { 
        user_id: insertData.user_id, 
        name: insertData.name, 
        due_day: insertData.due_day, 
        category: insertData.category, 
        status: insertData.status,
        value_encrypted: '***' 
      });

      const { data, error } = await supabase
        .from('bills')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[BILLS] ❌ Supabase error:', error);
        console.error('[BILLS] ❌ Supabase error code:', error.code);
        console.error('[BILLS] ❌ Supabase error message:', error.message);
        console.error('[BILLS] ❌ Supabase error details:', JSON.stringify(error));
        return res.status(500).json({ error: 'Erro ao salvar no banco: ' + error.message });
      }

      console.log('[BILLS] ✅ Conta criada com sucesso!');
      console.log('[BILLS] 📋 ID:', data.id);
      console.log('[BILLS] 📋 Nome:', data.name);
      console.log('[BILLS] ========================================');

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
      console.error('[BILLS] ❌❌❌ ERRO FATAL createBill ❌❌❌');
      console.error('[BILLS] Mensagem:', err.message);
      console.error('[BILLS] Stack:', err.stack);
      console.error('[BILLS] ========================================');
      res.status(500).json({ error: 'Erro ao criar conta: ' + err.message });
    }
  },

  // ===== BUSCAR UMA CONTA =====
  async getBill(req, res) {
    try {
      const { id } = req.params;
      console.log('[BILLS] 🔍 Buscando conta:', id);

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
        console.error(`[BILLS] ⚠️ Erro descriptografar ${id}:`, e.message);
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
      console.error('[BILLS] ❌ Erro getBill:', err);
      res.status(500).json({ error: 'Erro ao buscar conta' });
    }
  },

  // ===== ATUALIZAR CONTA =====
  async updateBill(req, res) {
    try {
      const { id } = req.params;
      const { name, value, due_day, category, status } = req.body;
      
      console.log('[BILLS] ✏️ Atualizando conta:', id);

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
        let encryptedValue;
        try {
          encryptedValue = encryptNumber(numValue);
        } catch (e) {
          encryptedValue = `plain:${numValue}`;
        }
        if (!encryptedValue) encryptedValue = `plain:${numValue}`;
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
      console.error('[BILLS] ❌ Erro updateBill:', err);
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  },

  // ===== DELETAR CONTA =====
  async deleteBill(req, res) {
    try {
      const { id } = req.params;
      console.log('[BILLS] 🗑️ Deletando conta:', id);

      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) {
        console.error('[BILLS] ❌ Erro delete:', error);
        return res.status(500).json({ error: 'Erro ao deletar conta' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('[BILLS] ❌ Erro deleteBill:', err);
      res.status(500).json({ error: 'Erro ao deletar conta' });
    }
  },

  // ===== ATUALIZAR STATUS =====
  async updateBillStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      console.log('[BILLS] 🔄 Atualizando status:', id, '->', status);

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
      console.error('[BILLS] ❌ Erro updateBillStatus:', err);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  // ===== DASHBOARD =====
  async getDashboardSummary(req, res) {
    try {
      console.log('[BILLS] 📊 Dashboard para:', req.userId);
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('salary_encrypted')
        .eq('id', req.userId)
        .single();

      if (userError) {
        console.error('[BILLS] ❌ Erro buscar usuário:', userError);
        return res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
      }

      const { data: bills, error } = await supabase
        .from('bills')
        .select('value_encrypted, status, due_day')
        .eq('user_id', req.userId);

      if (error) {
        console.error('[BILLS] ❌ Erro buscar contas:', error);
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

      console.log('[BILLS] ✅ Dashboard gerado com sucesso');

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
      console.error('[BILLS] ❌ Erro dashboard:', err);
      res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  }
};

module.exports = billsController;