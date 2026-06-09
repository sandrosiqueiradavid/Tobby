const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../db/supabase')

const authController = {
  async register(req, res) {
    try {
      const { name, email, password, salary = 0 } = req.body
      if (!name || !email || !password)
        return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })

      const { data: existing } = await supabase
        .from('users').select('id').eq('email', email).single()
      if (existing)
        return res.status(400).json({ error: 'E-mail já cadastrado' })

      const hash = await bcrypt.hash(password, 10)
      const { data: user, error } = await supabase
        .from('users')
        .insert({ name, email, password: hash, salary })
        .select('id, name, email, salary')
        .single()

      if (error) throw error

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' })
      res.status(201).json({ token, user })
    } catch (err) {
      console.error('Register error:', err)
      res.status(500).json({ error: 'Erro ao criar conta' })
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body
      if (!email || !password)
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })

      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, password, salary')
        .eq('email', email)
        .single()

      if (error || !user)
        return res.status(401).json({ error: 'E-mail ou senha inválidos' })

      const valid = await bcrypt.compare(password, user.password)
      if (!valid)
        return res.status(401).json({ error: 'E-mail ou senha inválidos' })

      delete user.password
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' })
      res.json({ token, user })
    } catch (err) {
      console.error('Login error:', err)
      res.status(500).json({ error: 'Erro ao fazer login' })
    }
  }
}

module.exports = authController
