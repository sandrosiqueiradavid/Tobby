const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const authController = {
  async register(req, res) {
    try {
      const { name, email, password, salary = 0 } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
      }

      // Verificar se usuário já existe
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
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id, name, email')
        .single();

      if (error) throw error;

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      
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
      console.error('Register error:', err);
      res.status(500).json({ error: 'Erro ao criar conta: ' + err.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, password, salary_encrypted')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos' });
      }

      let salary = 0;
      if (user.salary_encrypted) {
        try {
          salary = decryptNumber(user.salary_encrypted);
          if (isNaN(salary)) salary = 0;
        } catch (e) {
          salary = 0;
        }
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      
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
      console.error('Login error:', err);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }
};

module.exports = authController;