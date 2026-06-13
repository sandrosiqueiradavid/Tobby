const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const authController = {
  register: async (req, res) => {
    try {
      const { name, email, password, salary = 0 } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
      }

      // Verificar se usuário já existe na tabela 'users'
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'E-mail já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const encryptedSalary = encryptNumber(salary);

      const { data: user, error } = await supabase
        .from('users')
        .insert({ 
          name, 
          email, 
          password: hashedPassword, 
          salary_encrypted: encryptedSalary,
          salary: salary, // campo original (pode ser removido depois)
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id, name, email')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      res.status(201).json({ token, user: { ...user, salary } });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Erro ao criar conta: ' + err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, password, salary_encrypted, salary')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos' });
      }

      // Descriptografar salário se existir
      let salary = user.salary || 0;
      if (user.salary_encrypted) {
        const decrypted = decryptNumber(user.salary_encrypted);
        if (decrypted !== null && !isNaN(decrypted)) {
          salary = decrypted;
        }
      }

      delete user.password;
      delete user.salary_encrypted;
      delete user.salary;

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { ...user, salary } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', email)
        .single();

      if (error || !user) {
        // Por segurança, não informamos se o email existe ou não
        return res.json({ 
          message: 'Se o e-mail existir, você receberá as instruções de recuperação' 
        });
      }

      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Atualizar os campos de recuperação
      await supabase
        .from('users')
        .update({ 
          reset_token: resetToken, 
          reset_expires: new Date(Date.now() + 3600000) 
        })
        .eq('id', user.id);

      console.log(`🔐 Token de redefinição para ${email}: ${resetToken}`);
      console.log(`🔗 Link: ${process.env.FRONTEND_URL || 'https://sandrosiqueiradavid.github.io/Tobby'}?token=${resetToken}`);

      res.json({ 
        message: 'Se o e-mail existir, você receberá as instruções de recuperação'
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
      }

      if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({ error: 'Token inválido' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await supabase
        .from('users')
        .update({ 
          password: hashedPassword, 
          reset_token: null, 
          reset_expires: null 
        })
        .eq('id', user.id);

      res.json({ message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }
};

module.exports = authController;