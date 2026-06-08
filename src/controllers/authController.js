const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const authController = {
  // Registrar novo usuário
  async register(req, res) {
    try {
      const { name, email, password, salary = 0 } = req.body;
      
      // Validar campos obrigatórios
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }
      
      // Verificar se usuário já existe
      const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Criar usuário
      const result = await pool.query(
        'INSERT INTO users (name, email, password, salary) VALUES ($1, $2, $3, $4) RETURNING id, name, email, salary',
        [name, email, hashedPassword, salary]
      );
      
      const user = result.rows[0];
      
      // Gerar token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.status(201).json({ token, user });
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },
  
  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      // Buscar usuário
      const result = await pool.query(
        'SELECT id, name, email, password, salary FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }
      
      const user = result.rows[0];
      
      // Verificar senha
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }
      
      // Remover senha do objeto
      delete user.password;
      
      // Gerar token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({ token, user });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

module.exports = authController;
