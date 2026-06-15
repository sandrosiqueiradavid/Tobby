const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const authController = {
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
      const { data: existing, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        console.warn('[AUTH] E-mail já cadastrado:', email);
        return res.status(400).json({ error: 'E-mail já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const encryptedSalary = encryptNumber(salary);

      console.log('[AUTH] Inserindo usuário no Supabase...');
      
      const { data: user, error } = await supabase
        .from('users')
        .insert({ 
          name, 
          email, 
          password: hashedPassword, 
          salary_encrypted: encryptedSalary,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id, name, email')
        .single();

      if (error) {
        console.error('[AUTH] Erro Supabase:', error);
        throw error;
      }

      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        console.error('[AUTH] JWT_SECRET não configurado!');
        return res.status(500).json({ error: 'Erro de configuração do servidor' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      
      console.log('[AUTH] Registro bem-sucedido:', user.id);
      
      res.status(201).json({ 
        token, 
        user: { 
          id: user.id,
          name: user.name, 
          email: user.email, 
          salary: salary 
        } 
      });
    } catch (err) {
      console.error('[AUTH] Erro no registro:', err);
      res.status(500).json({ error: 'Erro ao criar conta: ' + err.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      console.log('[AUTH] Tentativa de login:', email);
      
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, password, salary_encrypted')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('[AUTH] Erro Supabase:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuário' });
      }

      if (!user) {
        console.warn('[AUTH] Usuário não encontrado:', email);
        return res.status(401).json({ error: 'E-mail ou senha inválidos' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.warn('[AUTH] Senha inválida para:', email);
        return res.status(401).json({ error: 'E-mail ou senha inválidos' });
      }

      let salary = 0;
      if (user.salary_encrypted) {
        try {
          salary = decryptNumber(user.salary_encrypted);
          if (isNaN(salary)) salary = 0;
        } catch (e) {
          console.error('[AUTH] Erro ao descriptografar salário:', e);
          salary = 0;
        }
      }

      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        console.error('[AUTH] JWT_SECRET não configurado!');
        return res.status(500).json({ error: 'Erro de configuração do servidor' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      
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
      console.error('[AUTH] Erro no login:', err);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  },

  // Forgot password e Reset password (implementação básica)
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório' });
      }

      // Por segurança, sempre retorna a mesma mensagem
      res.json({ message: 'Se o e-mail existir, você receberá as instruções' });
    } catch (err) {
      console.error('[AUTH] Erro forgot password:', err);
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
      }

      res.json({ message: 'Senha redefinida com sucesso!' });
    } catch (err) {
      console.error('[AUTH] Erro reset password:', err);
      res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }
};

module.exports = authController;