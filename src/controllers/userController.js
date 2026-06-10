const supabase = require('../db/supabase');

const userController = {
  getProfile: async (req, res) => {
    try {
      const { data: user, error } = await supabase
        .from('tobby_users')
        .select('id, name, email, salary, created_at')
        .eq('id', req.userId)
        .single();
      
      if (error) throw error;
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      res.json(user);
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

      const { data: user, error } = await supabase
        .from('tobby_users')
        .update({ salary, updated_at: new Date() })
        .eq('id', req.userId)
        .select('id, name, email, salary')
        .single();
      
      if (error) throw error;
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      res.json(user);
    } catch (err) {
      console.error('Update salary error:', err);
      res.status(500).json({ error: 'Erro ao atualizar salário' });
    }
  }
};

module.exports = userController;