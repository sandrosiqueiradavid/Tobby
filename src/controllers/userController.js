const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const userController = {
  getProfile: async (req, res) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, salary_encrypted, salary, created_at')
        .eq('id', req.userId)
        .single();

      if (error) throw error;
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Descriptografar salário se existir
      let salary = user.salary || 0;
      if (user.salary_encrypted) {
        const decrypted = decryptNumber(user.salary_encrypted);
        if (decrypted !== null && !isNaN(decrypted)) {
          salary = decrypted;
        }
      }

      delete user.salary_encrypted;
      delete user.salary;

      res.json({ ...user, salary });
    } catch (err) {
      console.error('Get profile error:', err);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  },

  updateSalary: async (req, res) => {
    try {
      const { salary } = req.body;
      if (salary === undefined || isNaN(salary)) {
        return res.status(400).json({ error: 'Salário inválido' });
      }

      const encryptedSalary = encryptNumber(salary);

      const { data: user, error } = await supabase
        .from('users')
        .update({ 
          salary_encrypted: encryptedSalary, 
          salary: salary, // campo original (pode ser removido depois)
          updated_at: new Date() 
        })
        .eq('id', req.userId)
        .select('id, name, email')
        .single();

      if (error) throw error;
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ ...user, salary });
    } catch (err) {
      console.error('Update salary error:', err);
      res.status(500).json({ error: 'Erro ao atualizar salário' });
    }
  }
};

module.exports = userController;