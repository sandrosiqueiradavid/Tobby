# 🐶 Tobby Backend - Guia Completo

## ✅ O que foi criado

### Backend Node.js + Express + PostgreSQL

**Estrutura de arquivos:**
```
backend/
├── src/
│   ├── index.js                 # Servidor Express principal
│   ├── db/
│   │   ├── connection.js        # Conexão PostgreSQL
│   │   ├── schema.sql           # Schema do banco
│   │   ├── migrations.js        # Script para criar tabelas
│   │   └── seed.js              # Popular com dados de demo
│   ├── middleware/
│   │   └── auth.js              # JWT authentication
│   └── routes/
│       ├── auth.js              # Rotas de autenticação
│       ├── user.js              # Rotas de usuário
│       └── bills.js             # Rotas de contas
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

### Stack Tecnológico

✅ Node.js 22  
✅ Express.js  
✅ PostgreSQL com Supabase  
✅ JWT Authentication  
✅ bcryptjs para senhas  
✅ Joi para validação  
✅ CORS habilitado  

## 🚀 Próximos Passos

### 1️⃣ Fazer Commit e Push

```bash
cd /seu/caminho/Tobby
git add .
git commit -m "feat: Add Node.js backend with Express and PostgreSQL

- Setup Express server with CORS
- Create PostgreSQL schema (users, bills tables)
- Implement JWT authentication with bcrypt
- Add user routes (profile, salary)
- Add bills CRUD routes with filtering/sorting
- Add dashboard summary endpoint
- Create migration and seed scripts
- Include environment configuration"

git push origin backend/node-express-postgres
```

### 2️⃣ Configurar PostgreSQL Local

```bash
# Instalar PostgreSQL (se não tiver)
# macOS:
brew install postgresql

# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# Iniciar PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start   # Linux

# Criar banco de dados
createdb tobby_db -U postgres
```

### 3️⃣ Configurar Backend Local

```bash
cd backend

# Copiar .env
cp .env.example .env

# Editar .env com suas credenciais PostgreSQL
nano .env
# Alterar:
# POSTGRES_USER=seu_usuario
# POSTGRES_PASSWORD=sua_senha
# POSTGRES_HOST=localhost
# POSTGRES_DB=tobby_db

# Instalar dependências
npm install

# Executar migrations
npm run migrate

# Popular com dados de exemplo
npm run seed

# Iniciar servidor
npm run dev
```

Servidor estará em: **http://localhost:3000**

### 4️⃣ Testar API Localmente

```bash
# Testar login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@tobby.com","password":"123456"}'

# Você receberá um token JWT
# Use-o nas próximas requisições com header:
# Authorization: Bearer {seu_token}
```

### 5️⃣ Integrar Frontend com Backend

Criar arquivo `frontend/api.js` com:

```javascript
const API_BASE = 'http://localhost:3000/api';

class TobbyAPI {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) this.setToken(data.token);
    return data;
  }

  async register(name, email, password, salary) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, email, password, salary })
    });
    const data = await res.json();
    if (res.ok) this.setToken(data.token);
    return data;
  }

  async getBills(status = null) {
    const url = status 
      ? `${API_BASE}/bills?status=${status}`
      : `${API_BASE}/bills`;
    const res = await fetch(url, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  async createBill(name, value, due_day, category, status = 'pending') {
    const res = await fetch(`${API_BASE}/bills`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, value, due_day, category, status })
    });
    return res.json();
  }

  async updateBillStatus(id, status) {
    const res = await fetch(`${API_BASE}/bills/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  }

  async deleteBill(id) {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  async getDashboard() {
    const res = await fetch(`${API_BASE}/bills/dashboard/summary`, {
      headers: this.getHeaders()
    });
    return res.json();
  }
}

const api = new TobbyAPI();
```

### 6️⃣ Atualizar `index.html`

**Adicionar no início do `<script>` final:**

```html
<script src="api.js"></script>
```

**Modificar funções principais:**

```javascript
// Antes: function doLogin()
async function doLogin(){
  const email = document.getElementById('login-email').value.trim()
  const pwd = document.getElementById('login-pwd').value
  
  try {
    const result = await api.login(email, pwd)
    state.currentUser = result.user
    enterApp()
  } catch(error) {
    document.getElementById('login-err').style.display='block'
  }
}

// Antes: function doRegister()
async function doRegister(){
  const name = document.getElementById('reg-name').value.trim()
  const email = document.getElementById('reg-email').value.trim()
  const pwd = document.getElementById('reg-pwd').value
  const salary = parseFloat(document.getElementById('reg-salary').value)||0
  
  try {
    const result = await api.register(name, email, pwd, salary)
    state.currentUser = result.user
    enterApp()
  } catch(error) {
    showToast('Erro ao registrar')
  }
}

// Antes: function renderBills()
async function renderBills(filter){
  try {
    const response = await api.getBills(filter === 'all' ? null : filter)
    const bills = response.data
    
    // Resto do código mantém igual
    // Apenas use `bills` em vez de `d.bills`
  } catch(error) {
    showToast('Erro ao carregar contas')
  }
}

// Antes: function saveBill()
async function saveBill(){
  const name = document.getElementById('f-name').value.trim()
  const value = parseFloat(document.getElementById('f-val').value)
  const dueDay = parseInt(document.getElementById('f-day').value)
  const category = document.getElementById('f-cat').value
  
  try {
    await api.createBill(name, value, dueDay, category, 'pending')
    renderBills('all')
    renderHome()
    showToast('Conta salva 🐶')
  } catch(error) {
    showToast('Erro ao salvar')
  }
}

// Antes: function toggleStatus()
async function toggleStatus(id){
  try {
    const newStatus = /* lógica para determinar novo status */
    await api.updateBillStatus(id, newStatus)
    renderBills(currentFilter)
  } catch(error) {
    showToast('Erro ao atualizar')
  }
}
```

### 7️⃣ Deploy no Railway

```bash
# 1. Criar conta em railway.app

# 2. Criar novo projeto
# - "New Project" > "Deploy from GitHub"
# - Autorizar e selecionar repositório "Tobby"
# - Selecionar branch "backend/node-express-postgres"

# 3. Railway cria automaticamente:
# - Variáveis de banco: DATABASE_URL, PGUSER, PGPASSWORD, etc
# - Domínio: https://tobby-production.railway.app

# 4. Adicionar variáveis manualmente:
# JWT_SECRET=gerar_uma_string_aleatoria_segura_muito_longa
# NODE_ENV=production

# 5. Deploy automático ao fazer push
git push origin backend/node-express-postgres
```

### 8️⃣ Configurar Supabase (Alternativa ao Railway)

```bash
# 1. Acessar supabase.com
# 2. New Project
# 3. Copiar CONNECTION_STRING
# 4. Usar em DATABASE_URL no .env

# Exemplo:
# DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
```

## 📊 Endpoints Disponíveis

### Auth
```
POST /api/auth/register   - Criar conta
POST /api/auth/login      - Fazer login
```

### User
```
GET /api/user/profile     - Perfil do usuário
PUT /api/user/salary      - Atualizar salário
```

### Bills
```
GET /api/bills                    - Listar contas
GET /api/bills?status=pending     - Filtrar por status
POST /api/bills                   - Criar conta
PUT /api/bills/:id                - Editar conta
DELETE /api/bills/:id             - Deletar conta
PATCH /api/bills/:id/status       - Mudar status
GET /api/bills/dashboard/summary  - Resumo dashboard
```

## 🧪 Teste Local Completo

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Saída: 🚀 Servidor rodando em http://localhost:3000

# Terminal 2: Abrir arquivo HTML no navegador
# Abra frontend/index.html no navegador
# ou use um servidor local:
python -m http.server 8000

# Teste:
# 1. Login: demo@tobby.com / 123456
# 2. Criar nova conta
# 3. Adicionar contas/boletos
# 4. Marcar como pago
# 5. Logout e login novamente
# Dados devem estar no banco!
```

## ⚠️ Importante

### Segurança
- ✅ Senhas com bcrypt
- ✅ JWT para autenticação
- ✅ Validação com Joi
- ⚠️ Usar HTTPS em produção
- ⚠️ JWT_SECRET deve ser aleatório e seguro

### Variáveis de Ambiente
- **Nunca** fazer commit de `.env`
- ✅ Está no `.gitignore`
- Use `.env.example` como template

### Rate Limiting
- Implementar em produção para evitar ataques
- Usar `express-rate-limit`

## 📚 Estrutura de Dados

### Users
```sql
id (UUID) → Identificador único
name (VARCHAR) → Nome do usuário
email (VARCHAR UNIQUE) → E-mail único
password_hash (VARCHAR) → Senha criptografada
salary (DECIMAL) → Salário mensal
created_at, updated_at (TIMESTAMP) → Datas
```

### Bills
```sql
id (UUID) → Identificador único
user_id (UUID) → Referência ao usuário
name (VARCHAR) → Nome da conta
value (DECIMAL) → Valor
due_day (INT) → Dia de vencimento (1-31)
category (VARCHAR) → Categoria
status (VARCHAR) → pending|paid|late
created_at, updated_at (TIMESTAMP) → Datas
```

## 🆘 Troubleshooting

### Erro: "Cannot find module 'express'"
```bash
npm install
```

### Erro: "connect ECONNREFUSED 127.0.0.1:5432"
- PostgreSQL não está rodando
- Verificar credenciais em .env

### Erro: "Token inválido"
- JWT_SECRET diferente entre frontend e backend
- Token expirou (renovar fazendo login)

### CORS Error
- Verificar se `FRONTEND_URL` está correto em .env

## ✨ Próximas Features (Fase 2)

- [ ] Autenticação com Google OAuth
- [ ] Integração com Claude API
- [ ] Gráficos e relatórios
- [ ] Notificações de contas vencidas
- [ ] Export de dados (PDF/CSV)
- [ ] Metas financeiras
- [ ] Backup automático

---

**Status**: ✅ Backend pronto para integração  
**Data**: Junho 2026  
**Versão**: 1.0.0
