// src/controllers/billsController.js
const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../services/encryptionService');

const billsController = {
  // ===== LISTAR CONTAS (COM DESCRIPTOGRAFIA) =====
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
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar contas: ' + error.message 
        });
      }

      // Descriptografar os valores
      const decryptedData = (data || []).map(bill => {
        let value = 0;
        try {
          if (bill.value_encrypted) {
            value = decryptNumber(bill.value_encrypted);
          } else if (bill.value !== undefined && bill.value !== null) {
            value = parseFloat(bill.value) || 0;
          }
        } catch (e) {
          console.warn(`[BILLS] ⚠️ Erro ao descriptografar conta ${bill.id}:`, e.message);
          value = parseFloat(bill.value) || 0;
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
      
      res.json({
        success: true,
        data: decryptedData
      });
    } catch (err) {
      console.error('[BILLS] ❌ Erro getBills:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno ao listar contas' 
      });
    }
  },

  // ===== CRIAR CONTA (COM CRIPTOGRAFIA) =====
  async createBill(req, res) {
    try {
      const { name, value, due_day, category = 'outros', status = 'pending' } = req.body;
      
      console.log('[BILLS] ➕ Criando nova conta...');
      console.log('[BILLS] 📊 Dados recebidos:', { name, value, due_day, category, status });

      // ----- VALIDAÇÕES -----
      if (!name || name.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: 'Nome da conta é obrigatório' 
        });
      }

      if (value === undefined || value === null) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valor da conta é obrigatório' 
        });
      }

      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valor deve ser um número positivo' 
        });
      }

      if (!due_day) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dia de vencimento é obrigatório' 
        });
      }

      const numDueDay = parseInt(due_day);
      if (isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dia de vencimento deve ser entre 1 e 31' 
        });
      }

      // ----- CRIPTOGRAFAR O VALOR -----
      const encryptedValue = encryptNumber(numValue);
      console.log('[BILLS] 🔐 Valor criptografado:', encryptedValue ? '✅ OK' : '⚠️ FALHA');

      // ----- INSERIR NO BANCO -----
      const { data, error } = await supabase
        .from('bills')
        .insert({
          user_id: req.userId,
          name: name.trim(),
          value_encrypted: encryptedValue,
          value: numValue,
          due_day: numDueDay,
          category: category || 'outros',
          status: status || 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('[BILLS] ❌ Erro ao inserir no Supabase:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao salvar conta: ' + error.message 
        });
      }

      console.log('[BILLS] ✅ Conta criada com sucesso! ID:', data.id);
      
      res.status(201).json({
        success: true,
        message: 'Conta criada com sucesso',
        data: {
          id: data.id,
          name: data.name,
          value: numValue,
          due_day: data.due_day,
          category: data.category,
          status: data.status,
          created_at: data.created_at
        }
      });
    } catch (err) {
      console.error('[BILLS] ❌ Erro createBill:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno ao criar conta: ' + err.message 
      });
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
          return res.status(404).json({ 
            success: false, 
            error: 'Conta não encontrada' 
          });
        }
        throw error;
      }

      let value = 0;
      try {
        if (data.value_encrypted) {
          value = decryptNumber(data.value_encrypted);
        } else if (data.value !== undefined && data.value !== null) {
          value = parseFloat(data.value) || 0;
        }
      } catch (e) {
        console.warn(`[BILLS] ⚠️ Erro ao descriptografar conta ${id}:`, e.message);
        value = parseFloat(data.value) || 0;
      }

      res.json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          value: value,
          due_day: data.due_day,
          category: data.category || 'outros',
          status: data.status || 'pending',
          created_at: data.created_at,
          updated_at: data.updated_at
        }
      });
    } catch (err) {
      console.error('[BILLS] ❌ Erro getBill:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar conta' 
      });
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
        return res.status(404).json({ 
          success: false, 
          error: 'Conta não encontrada' 
        });
      }

      const updateData = { updated_at: new Date() };

      if (name !== undefined && name.trim() !== '') {
        updateData.name = name.trim();
      }

      if (value !== undefined) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'Valor deve ser um número positivo' 
          });
        }
        updateData.value = numValue;
        updateData.value_encrypted = encryptNumber(numValue);
      }

      if (due_day !== undefined) {
        const numDueDay = parseInt(due_day);
        if (isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) {
          return res.status(400).json({ 
            success: false, 
            error: 'Dia de vencimento deve ser entre 1 e 31' 
          });
        }
        updateData.due_day = numDueDay;
      }

      if (category !== undefined) {
        updateData.category = category;
      }

      if (status !== undefined) {
        if (!['pending', 'paid', 'late'].includes(status)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Status inválido. Use: pending, paid ou late' 
          });
        }
        updateData.status = status;
      }

      const { data, error } = await supabase
        .from('bills')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) {
        console.error('[BILLS] ❌ Erro ao atualizar:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao atualizar conta: ' + error.message 
        });
      }

      let finalValue = 0;
      try {
        if (data.value_encrypted) {
          finalValue = decryptNumber(data.value_encrypted);
        } else if (data.value !== undefined && data.value !== null) {
          finalValue = parseFloat(data.value) || 0;
        }
      } catch (e) {
        finalValue = parseFloat(data.value) || 0;
      }

      console.log('[BILLS] ✅ Conta atualizada com sucesso:', id);
      
      res.json({
        success: true,
        message: 'Conta atualizada com sucesso',
        data: {
          ...data,
          value: finalValue
        }
      });
    } catch (err) {
      console.error('[BILLS] ❌ Erro updateBill:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno ao atualizar conta' 
      });
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
        console.error('[BILLS] ❌ Erro ao deletar:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao deletar conta: ' + error.message 
        });
      }

      console.log('[BILLS] ✅ Conta deletada com sucesso:', id);
      
      res.json({
        success: true,
        message: 'Conta deletada com sucesso'
      });
    } catch (err) {
      console.error('[BILLS] ❌ Erro deleteBill:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno ao deletar conta' 
      });
    }
  },

  // ===== ATUALIZAR STATUS =====
  async updateBillStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      console.log('[BILLS] 🔄 Alterando status da conta:', id, '->', status);

      if (!status) {
        return res.status(400).json({ 
          success: false, 
          error: 'Status é obrigatório' 
        });
      }

      const validStatus = ['pending', 'paid', 'late'];
      if (!validStatus.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Status inválido. Use: pending, paid ou late' 
        });
      }

      const { data, error } = await supabase
        .from('bills')
        .update({ 
          status: status,
          updated_at: new Date()
        })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) {
        console.error('[BILLS] ❌ Erro ao atualizar status:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao atualizar status: ' + error.message 
        });
      }

      let value = 0;
      try {
        if (data.value_encrypted) {
          value = decryptNumber(data.value_encrypted);
        } else if (data.value !== undefined && data.value !== null) {
          value = parseFloat(data.value) || 0;
        }
      } catch (e) {
        value = parseFloat(data.value) || 0;
      }

      console.log('[BILLS] ✅ Status alterado com sucesso:', id, '->', status);
      
      res.json({
        success: true,
        message: `Status alterado para ${status}`,
        data: {
          ...data,
          value: value
        }
      });
    } catch (err) {
      console.error('[BILLS] ❌ Erro updateBillStatus:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno ao atualizar status' 
      });
    }
  },

  // ===== DASHBOARD =====
  async getDashboardSummary(req, res) {
    try {
      console.log('[BILLS] 📊 Gerando resumo do dashboard para:', req.userId);
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('salary')
        .eq('id', req.userId)
        .single();

      if (userError) {
        console.error('[BILLS] ❌ Erro ao buscar salário:', userError);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar dados do usuário' 
        });
      }

      const { data: bills, error } = await supabase
        .from('bills')
        .select('value_encrypted, value, status, due_day')
        .eq('user_id', req.userId);

      if (error) {
        console.error('[BILLS] ❌ Erro ao buscar contas:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar contas' 
        });
      }

      const salary = user?.salary || 0;
      const today = new Date().getDate();

      const allBills = (bills || []).map(b => {
        let value = 0;
        try {
          if (b.value_encrypted) {
            value = decryptNumber(b.value_encrypted);
          } else if (b.value !== undefined && b.value !== null) {
            value = parseFloat(b.value) || 0;
          }
        } catch (e) {
          value = parseFloat(b.value) || 0;
        }
        return { ...b, value };
      });

      const paid = allBills.filter(b => b.status === 'paid');
      const pending = allBills.filter(b => b.status === 'pending' && b.due_day >= today);
      const late = allBills.filter(b => b.status === 'late' || (b.status === 'pending' && b.due_day < today));
      
      const totalPaid = paid.reduce((s, b) => s + (b.value || 0), 0);
      const totalCommitted = allBills.reduce((s, b) => s + (b.value || 0), 0);
      const freeBalance = salary - totalPaid;
      const percentageCommitted = salary > 0 ? Math.round((totalCommitted / salary) * 100) : 0;

      console.log('[BILLS] ✅ Resumo gerado com sucesso');
      
      res.json({
        success: true,
        data: {
          salary,
          totalBills: allBills.length,
          paidBills: paid.length,
          pendingBills: pending.length,
          lateBills: late.length,
          totalPaid,
          freeBalance: Math.max(0, freeBalance),
          percentageCommitted: Math.min(100, percentageCommitted)
        }
      });
    } catch (err) {
      console.error('[BILLS] ❌ Erro dashboard:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao gerar resumo do dashboard' 
      });
    }
  }
};

module.exports = billsController;