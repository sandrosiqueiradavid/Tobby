const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const billsController = {
  // Listar contas do usuário
  async getBills(req, res) {
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

      const decryptedData = (data || []).map(bill => {
        let value = 0;
        try {
          value = decryptNumber(bill.value_encrypted);
          if (isNaN(value)) value = 0;
        } catch (e) {
          console.error('Erro ao descriptografar:', e);
          value = 0;
        }
        return {
          id: bill.id,
          user_id: bill.user_id,
          name: bill.name,
          value: value,
          due_day: bill.due_day,
          category: bill.category,
          status: bill.status,
          created_at: bill.created_at,
          updated_at: bill.updated_at
        };
      });

      res.json({ data: decryptedData });
    } catch (err) {
      console.error('Get bills error:', err);
      res.status(500).json({ error: 'Erro ao listar contas: ' + err.message });
    }
  },

  // Criar nova conta
  async createBill(req, res) {
    try {
      const { name, value, due_day, category = 'outros', status = 'pending' } = req.body;

      if (!name || value === undefined || !due_day) {
        return res.status(400).json({ error: 'Nome, valor e dia de vencimento são obrigatórios' });
      }

      if (due_day < 1 || due_day > 31) {
        return res.status(400).json({ error: 'Dia de vencimento deve ser entre 1 e 31' });
      }

      const encryptedValue = encryptNumber(value);
      if (!encryptedValue) {
        return res.status(500).json({ error: 'Erro ao criptografar valor' });
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

      if (error) throw error;

      res.status(201).json({
        id: data.id,
        name: data.name,
        value: value,
        due_day: data.due_day,
        category: data.category,
        status: data.status,
        created_at: data.created_at
      });
    } catch (err) {
      console.error('Create bill error:', err);
      res.status(500).json({ error: 'Erro ao criar conta: ' + err.message });
    }
  },

  // Outros métodos (getBill, updateBill, deleteBill, updateBillStatus, getDashboardSummary)
  // ... mantêm-se iguais aos originais
};

module.exports = billsController;