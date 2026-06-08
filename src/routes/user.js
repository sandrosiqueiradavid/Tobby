const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db/connection');

const router = express.Router();

router.get('/profile', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, salary FROM users WHERE id = $1', [req.user.id]);
  res.json(result.rows[0]);
});

router.put('/salary', authenticateToken, async (req, res) => {
  const { salary } = req.body;
  await pool.query('UPDATE users SET salary = $1 WHERE id = $2', [salary, req.user.id]);
  res.json({ message: 'Salário atualizado', salary });
});

module.exports = router;
