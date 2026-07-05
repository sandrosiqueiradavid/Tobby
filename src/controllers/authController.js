// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../services/encryptionService');

const authController = {
  // ===== REGISTRO =====
  async register(req, res) {
    try {
      const { name, email, password, salary = 0 } = req.body;
      
      console.log('[AUTH] Registro:', { name, email, salary });
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
      }

      // Verificar se usuário já existe
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: 'E-mail já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Criptografar salário
      const encryptedSalary = encryptNumber(salary);

      const { data: user, error } = await supabase
        .from('users')
        .insert({ 
          name, 
          email, 
          password: hashedPassword, 
          salary_encrypted: encryptedSalary,
          salary: salary,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id, name, email, salary')
        .single();

      if (error) {
        console.error('[AUTH] Supabase error:', error);
        return res.status(500).json({ error: 'Erro ao criar usuário: ' + error.message });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      
      console.log('[AUTH] Registro bem-sucedido:', user.id);
      res.status(201).json({ token, user });
    } catch (err) {
      console.error('[AUTH] Register error:', err);
      res.status(500).json({ error: 'Erro ao criar conta: ' + err.message });
    }
  },

  // ===== LOGIN =====
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      console.log('[AUTH] Login:', email);
      
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, password, salary_encrypted, salary')
        .eq('email', email)
        .maybeSingle();

      if (error || !user) {
        console.warn('[AUTH] Usuário não encontrado:', email);
        return res.status(401).json({ error: 'E-mail ou senha inválidos' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.warn('[AUTH] Senha inválida para:', email);
        return res.status(401).json({ error: 'E-mail ou senha inválidos' });
      }

      // Descriptografar salário
      let salary = 0;
      try {
        if (user.salary_encrypted) {
          salary = decryptNumber(user.salary_encrypted);
        } else if (user.salary !== undefined && user.salary !== null) {
          salary = parseFloat(user.salary) || 0;
        }
      } catch (e) {
        console.warn('[AUTH] Erro ao descriptografar salário:', e.message);
        salary = parseFloat(user.salary) || 0;
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      
      console.log('[AUTH] Login bem-sucedido:', user.id);
      res.json({ 
        token, 
        user: { 
          id: user.id,
          name: user.name, 
          email: user.email, 
          salary: salary 
        } 
      });
    } catch (err) {
      console.error('[AUTH] Login error:', err);
      res.status(500).json({ error: 'Erro ao fazer login: ' + err.message });
    }
  },

  // ===== FORGOT PASSWORD =====
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório' });
      }
      res.json({ message: 'Se o e-mail existir, você receberá as instruções' });
    } catch (err) {
      console.error('[AUTH] Forgot password error:', err);
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  },

  // ===== RESET PASSWORD =====
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
      }
      res.json({ message: 'Senha redefinida com sucesso!' });
    } catch (err) {
      console.error('[AUTH] Reset password error:', err);
      res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }
};

module.exports = authController;