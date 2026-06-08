-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  salary DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de contas/boletos
CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  category VARCHAR(50) DEFAULT 'outros',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Inserir usuário demo
INSERT INTO users (name, email, password, salary) 
VALUES ('Usuário Demo', 'demo@tobby.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 5000)
ON CONFLICT (email) DO NOTHING;

-- Inserir contas demo
INSERT INTO bills (user_id, name, value, due_day, category, status) VALUES
(1, 'Aluguel', 1200, 5, 'moradia', 'pending'),
(1, 'Luz', 150, 10, 'utilidades', 'paid'),
(1, 'Internet', 89.90, 15, 'utilidades', 'pending'),
(1, 'Supermercado', 600, 20, 'alimentacao', 'pending')
ON CONFLICT DO NOTHING;
