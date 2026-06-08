const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../db/connection');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM bills WHERE user_id = $1';
  const params = [req.user.id];
  
  if (status && ['pending', 'paid', 'late'].includes(status)) {
    query += ' AND status = $2';
    params.push(status);
  }
  
  query += ' ORDER BY due_day ASC';
  const result = await pool.query(query, params);
  
  const data = result.rows.map(row => ({ ...row, value: parseFloat(row.value) }));
  res.json({ data });
});

router.post('/', authenticateToken, async (req, res) => {
  const { name, value, due_day, category, status } = req.body;
  const result = await pool.query(
    'INSERT INTO bills (user_id, name, value, due_day, category, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [req.user.id, name, value, due_day, category, status || 'pending']
  );
  const bill = result.rows[0];
  bill.value = parseFloat(bill.value);
  res.status(201).json(bill);
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { name, value, due_day, category, status } = req.body;
  const result = await pool.query(
    'UPDATE bills SET name=$1, value=$2, due_day=$3, category=$4, status=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
    [name, value, due_day, category, status, req.params.id, req.user.id]
  );
  const bill = result.rows[0];
  bill.value = parseFloat(bill.value);
  res.json(bill);
});

router.delete('/:id', authenticateToken, async (req, res) => {
  await pool.query('DELETE FROM bills WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ message: 'Removido com sucesso' });
});

router.patch('/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const result = await pool.query(
    'UPDATE bills SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
    [status, req.params.id, req.user.id]
  );
  const bill = result.rows[0];
  bill.value = parseFloat(bill.value);
  res.json(bill);
});

router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  const userResult = await pool.query('SELECT salary FROM users WHERE id=$1', [req.user.id]);
  const salary = parseFloat(userResult.rows[0]?.salary || 0);
  
  const billsResult = await pool.query('SELECT value, status FROM bills WHERE user_id=$1', [req.user.id]);
  
  let paidTotal = 0;
  let paid = 0, pending = 0, late = 0;
  
  for (const bill of billsResult.rows) {
    const val = parseFloat(bill.value);
    if (bill.status === 'paid') {
      paid++;
      paidTotal += val;
    } else if (bill.status === 'pending') {
      pending++;
    } else if (bill.status === 'late') {
      late++;
    }
  }
  
  res.json({
    salary,
    totalBills: billsResult.rows.length,
    paidBills: paid,
    pendingBills: pending,
    lateBills: late,
    freeBalance: salary - paidTotal,
    percentageCommitted: salary > 0 ? Math.round((paidTotal / salary) * 100) : 0
  });
});

module.exports = router;
