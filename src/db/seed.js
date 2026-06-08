const bcrypt = require('bcryptjs');
const { pool } = require('./connection');

async function seed() {
  console.log('🌱 Iniciando seed...');
  
  const client = await pool.connect();
  
  try {
    await client.query('DELETE FROM bills');
    await client.query('DELETE FROM users');
    
    const passwordHash = await bcrypt.hash('123456', 10);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, salary) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Demo User', 'demo@tobby.com', passwordHash, 8500]
    );
    
    const userId = userResult.rows[0].id;
    
    const bills = [
      ['Aluguel', 1500, 5, 'moradia', 'pending'],
      ['Energia', 180, 10, 'moradia', 'pending'],
      ['Internet', 99, 15, 'tecnologia', 'paid'],
      ['Supermercado', 600, 20, 'alimentacao', 'pending'],
      ['Academia', 120, 8, 'saude', 'paid'],
      ['Netflix', 45, 12, 'lazer', 'pending']
    ];
    
    for (const bill of bills) {
      await client.query(
        `INSERT INTO bills (user_id, name, value, due_day, category, status) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, bill[0], bill[1], bill[2], bill[3], bill[4]]
      );
    }
    
    console.log('✅ Seed concluído!');
    console.log('📧 demo@tobby.com / 123456');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
