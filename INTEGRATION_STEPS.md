# 🚀 Guia de Integração Frontend + Backend

## ✅ Arquivos Já Criados

| Arquivo | Localização | Função |
|---------|------------|--------|
| **api.js** | `frontend/api.js` | Cliente API para comunicação |
| **Backend completo** | `backend/src/` | Servidor Express + DB |
| **Documentação** | `BACKEND_SETUP.md` | Setup completo |

## 📝 Passo 1: Adicionar api.js ao index.html

Abra `index.html` e adicione antes do fechamento de `</body>`:

```html
<script src="api.js"></script>
```

## 🔧 Passo 2: Modificar Funções de Autenticação

### Função `doLogin()`

**Antes:**
```javascript
function doLogin(){
  const email = document.getElementById('login-email').value.trim()
  const pwd = document.getElementById('login-pwd').value
  const user = state.users.find(u=>u.email===email && u.pwd===pwd)
  if(!user && !(email==='demo@tobby.com' && pwd==='123456')){
    document.getElementById('login-err').style.display='block'; return
  }
  const u = user || {name:'Demo User',email:'demo@tobby.com',salary:8500}
  state.currentUser = u
  localStorage.setItem('tobby_current', JSON.stringify(u))
  document.getElementById('login-err').style.display='none'
  enterApp()
}
```

**Depois:**
```javascript
async function doLogin(){
  const email = document.getElementById('login-email').value.trim()
  const pwd = document.getElementById('login-pwd').value
  
  try {
    const user = await api.login(email, pwd)
    state.currentUser = user
    document.getElementById('login-err').style.display='none'
    enterApp()
  } catch(error) {
    console.error('Erro ao fazer login:', error)
    document.getElementById('login-err').style.display='block'
  }
}
```

### Função `doRegister()`

**Antes:**
```javascript
function doRegister(){
  const name = document.getElementById('reg-name').value.trim()
  const email = document.getElementById('reg-email').value.trim()
  const pwd = document.getElementById('reg-pwd').value
  const salary = parseFloat(document.getElementById('reg-salary').value)||0
  if(!name||!email||!pwd){showToast('Preencha todos os campos'); return}
  if(state.users.find(u=>u.email===email)){showToast('E-mail já cadastrado'); return}
  const user = {name,email,pwd,salary}
  state.users.push(user)
  localStorage.setItem('tobby_users', JSON.stringify(state.users))
  state.currentUser = user
  localStorage.setItem('tobby_current', JSON.stringify(user))
  enterApp()
}
```

**Depois:**
```javascript
async function doRegister(){
  const name = document.getElementById('reg-name').value.trim()
  const email = document.getElementById('reg-email').value.trim()
  const pwd = document.getElementById('reg-pwd').value
  const salary = parseFloat(document.getElementById('reg-salary').value)||0
  
  if(!name||!email||!pwd){
    showToast('Preencha todos os campos')
    return
  }
  
  try {
    const user = await api.register(name, email, pwd, salary)
    state.currentUser = user
    enterApp()
  } catch(error) {
    console.error('Erro ao registrar:', error)
    showToast(error.message || 'Erro ao criar conta')
  }
}
```

### Função `doLogout()`

**Antes:**
```javascript
function doLogout(){
  state.currentUser = null
  localStorage.removeItem('tobby_current')
  showScreen('login')
}
```

**Depois:**
```javascript
function doLogout(){
  state.currentUser = null
  api.clearToken()
  showScreen('login')
}
```

## 💾 Passo 3: Modificar Funções de Contas

### Função `renderBills()`

**Antes:**
```javascript
function renderBills(filter){
  const d = getUserData()
  let bills = d.bills
  const today = new Date().getDate()
  if(filter==='pending') bills = bills.filter(b=>b.status==='pending')
  else if(filter==='paid') bills = bills.filter(b=>b.status==='paid')
  else if(filter==='late') bills = bills.filter(b=>b.status==='late'||(b.status==='pending'&&b.dueDay<today))
  // ... resto do código
}
```

**Depois:**
```javascript
async function renderBills(filter){
  try {
    const response = await api.getBills(filter === 'all' ? null : filter)
    let bills = response.data
    const today = new Date().getDate()
    
    const el = document.getElementById('bills-list-main')
    if(!bills.length){ 
      el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--hint);font-size:13px">Nenhuma conta encontrada</div>'
      return 
    }
    
    el.innerHTML = bills.map(b=>{
      const cat = CATS[b.category]||CATS.outros
      const isLate = b.status==='pending' && b.due_day < today
      const statusChip = b.status==='paid'?'<span class="chip chip-green">Pago</span>':
        isLate?'<span class="chip chip-red">Atrasado</span>':
        '<span class="chip chip-amber">Pendente</span>'
      return `<div class="bill-item">
        <div class="bill-icon" style="background:${cat.bg}">${cat.emoji}</div>
        <div class="bill-info">
          <div class="bill-name">${b.name}</div>
          <div class="bill-meta">Vence dia ${b.due_day} · ${b.category}</div>
        </div>
        <div class="bill-right">
          <div class="bill-val">R$ ${b.value.toFixed(2).replace('.',',')}</div>
          <div class="bill-status">${statusChip}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;margin-left:.25rem">
          <div style="font-size:17px;cursor:pointer" onclick="toggleStatus('${b.id}')" title="Alternar status">${b.status==='paid'?'↩️':'✅'}</div>
          <div style="font-size:17px;cursor:pointer" onclick="openModal('${b.id}')" title="Editar">✏️</div>
          <div style="font-size:17px;cursor:pointer" onclick="deleteBill('${b.id}')" title="Remover">🗑️</div>
        </div>
      </div>`
    }).join('')
  } catch(error) {
    console.error('Erro ao listar contas:', error)
    showToast('Erro ao carregar contas')
  }
}
```

### Função `saveBill()`

**Antes:**
```javascript
function saveBill(){
  const name = document.getElementById('f-name').value.trim()
  const value = parseFloat(document.getElementById('f-val').value)
  const dueDay = parseInt(document.getElementById('f-day').value)
  if(!name||!value||!dueDay){showToast('Preencha todos os campos'); return}
  const d = getUserData()
  const eid = document.getElementById('f-id').value
  const bill = {
    id: eid||Date.now().toString(),
    name, value, dueDay,
    category: document.getElementById('f-cat').value,
    status: document.getElementById('f-status').value
  }
  if(eid){ const i=d.bills.findIndex(x=>x.id===eid); if(i>-1)d.bills[i]=bill }
  else d.bills.push(bill)
  saveUserData(d)
  closeModal()
  renderBills('all')
  renderHome()
  showToast('Conta salva com sucesso 🐶')
}
```

**Depois:**
```javascript
async function saveBill(){
  const name = document.getElementById('f-name').value.trim()
  const value = parseFloat(document.getElementById('f-val').value)
  const dueDay = parseInt(document.getElementById('f-day').value)
  if(!name||!value||!dueDay){showToast('Preencha todos os campos'); return}
  
  const category = document.getElementById('f-cat').value
  const status = document.getElementById('f-status').value
  const eid = document.getElementById('f-id').value
  
  try {
    if(eid) {
      await api.updateBill(eid, name, value, dueDay, category, status)
    } else {
      await api.createBill(name, value, dueDay, category, status)
    }
    closeModal()
    renderBills('all')
    renderHome()
    showToast('Conta salva com sucesso 🐶')
  } catch(error) {
    console.error('Erro ao salvar conta:', error)
    showToast(error.message || 'Erro ao salvar conta')
  }
}
```

### Função `deleteBill()`

**Antes:**
```javascript
function deleteBill(id){
  if(!confirm('Remover esta conta?')) return
  const d = getUserData()
  d.bills = d.bills.filter(b=>b.id!==id)
  saveUserData(d)
  renderBills('all')
  renderHome()
  showToast('Conta removida')
}
```

**Depois:**
```javascript
async function deleteBill(id){
  if(!confirm('Remover esta conta?')) return
  try {
    await api.deleteBill(id)
    renderBills('all')
    renderHome()
    showToast('Conta removida')
  } catch(error) {
    console.error('Erro ao deletar:', error)
    showToast(error.message || 'Erro ao deletar conta')
  }
}
```

### Função `toggleStatus()`

**Antes:**
```javascript
function toggleStatus(id){
  const d = getUserData()
  const b = d.bills.find(x=>x.id===id)
  if(!b) return
  b.status = b.status==='paid'?'pending':'paid'
  saveUserData(d)
  renderBills(currentFilter)
  renderHome()
  showToast(b.status==='paid'?'✅ Marcada como paga':'↩️ Marcada como pendente')
}
```

**Depois:**
```javascript
async function toggleStatus(id){
  try {
    const response = await api.getBills()
    const bill = response.data.find(b => b.id === id)
    if(!bill) return
    
    const newStatus = bill.status==='paid'?'pending':'paid'
    await api.updateBillStatus(id, newStatus)
    renderBills(currentFilter)
    renderHome()
    showToast(newStatus==='paid'?'✅ Marcada como paga':'↩️ Marcada como pendente')
  } catch(error) {
    console.error('Erro ao atualizar status:', error)
  }
}
```

## 📊 Passo 4: Modificar Dashboard

### Função `renderHome()`

**Parte importante (manter o resto igual):**

```javascript
async function renderHome(){
  const u = state.currentUser
  if(!u) return
  
  try {
    // Buscar dados da API em vez de localStorage
    const dashboard = await api.getDashboard()
    const billsResponse = await api.getBills()
    const bills = billsResponse.data || []
    const today = new Date().getDate()
    
    // Usar dados do dashboard
    const salary = dashboard.salary
    const paid = dashboard.paidBills
    const pending = dashboard.pendingBills
    const late = dashboard.lateBills
    const free = dashboard.freeBalance
    const pct = dashboard.percentageCommitted
    
    // Atualizar UI
    document.getElementById('home-name').textContent = u.name.split(' ')[0]
    document.getElementById('bal-free').textContent = 'R$ '+free.toFixed(2).replace('.',',')
    document.getElementById('bal-in').textContent = 'R$ '+salary.toFixed(2).replace('.',',')
    document.getElementById('bal-out').textContent = '- R$ '+(salary-free).toFixed(2).replace('.',',')
    document.getElementById('bal-pct').textContent = pct+'%'
    document.getElementById('stat-paid').textContent = paid
    document.getElementById('stat-pend').textContent = pending
    document.getElementById('stat-late').textContent = late
    document.getElementById('stat-total').textContent = bills.length
    const pp = bills.length>0?Math.round((paid/bills.length)*100):0
    document.getElementById('prog-paid').style.width=pp+'%'
    document.getElementById('stat-paid-pct').textContent=pp+'% do total'
    
    // Próximas contas
    const upcoming = bills.filter(b => b.status === 'pending' || b.status === 'late')
      .sort((a,b)=>a.due_day-b.due_day)
      .slice(0,4)
    const hbl = document.getElementById('home-bills-list')
    if(!upcoming.length){ 
      hbl.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--hint);font-size:13px">Sem contas pendentes 🎉</div>'
    } else {
      hbl.innerHTML = upcoming.map(b=>{
        const cat=CATS[b.category]||CATS.outros
        const isLate=b.due_day<today
        return `<div class="bill-item" onclick="navTo('bills')">
          <div class="bill-icon" style="background:${cat.bg}">${cat.emoji}</div>
          <div class="bill-info"><div class="bill-name">${b.name}</div><div class="bill-meta">${isLate?'Atrasada':'Vence dia '+b.due_day}</div></div>
          <div class="bill-right">
            <div class="bill-val">R$ ${b.value.toFixed(2).replace('.',',')}</div>
            <div class="bill-status">${isLate?'<span class="chip chip-red">Atrasado</span>':'<span class="chip chip-amber">Pendente</span>'}</div>
          </div>
        </div>`
      }).join('')
    }
  } catch(error) {
    console.error('Erro ao carregar home:', error)
  }
}
```

## 🔑 Passo 5: Modificar editSalary()

**Antes:**
```javascript
function editSalary(){
  const d = getUserData()
  const cur = d.salary||(state.currentUser?.salary)||0
  const novo = prompt('Informe seu salário mensal (R$):', cur)
  if(novo===null) return
  const val = parseFloat(novo)
  if(isNaN(val)||val<0){showToast('Valor inválido'); return}
  d.salary = val
  saveUserData(d)
  if(state.currentUser){ state.currentUser.salary=val; localStorage.setItem('tobby_current',JSON.stringify(state.currentUser)) }
  renderHome()
  showToast('Salário atualizado 💰')
}
```

**Depois:**
```javascript
async function editSalary(){
  const u = state.currentUser
  const cur = u?.salary || 0
  const novo = prompt('Informe seu salário mensal (R$):', cur)
  if(novo===null) return
  const val = parseFloat(novo)
  if(isNaN(val)||val<0){showToast('Valor inválido'); return}
  
  try {
    const updated = await api.updateSalary(val)
    state.currentUser.salary = updated.salary
    renderHome()
    showToast('Salário atualizado 💰')
  } catch(error) {
    console.error('Erro ao atualizar salário:', error)
    showToast(error.message || 'Erro ao atualizar salário')
  }
}
```

## 🏁 Passo 6: Inicialização

**Antes:**
```javascript
// ===== INIT =====
if(state.currentUser){ showScreen('app'); refreshAll(); navTo('home') }
```

**Depois:**
```javascript
// ===== INIT =====
if(api.token){
  enterApp()
} else {
  showScreen('login')
}
```

## 🧪 Testar Integração

### 1. Iniciar Backend
```bash
cd backend
npm run dev
# Saída: 🚀 Servidor rodando em http://localhost:3000
```

### 2. Abrir Frontend
```bash
# Abra index.html no navegador
# ou use um servidor local:
cd frontend
python -m http.server 8000
# Acesse: http://localhost:8000
```

### 3. Testes

- ✅ Registrar nova conta
- ✅ Fazer login
- ✅ Criar conta/boleto
- ✅ Atualizar salário
- ✅ Marcar como pago
- ✅ Deletar conta
- ✅ Logout
- ✅ Login novamente (dados devem persistir no banco)

## 📱 Deploy em Produção

### 1. Backend no Railway

```bash
git push origin backend/node-express-postgres
```

No Railway.app:
- Criar novo projeto do GitHub
- Selecionar branch `backend/node-express-postgres`
- Adicionar PostgreSQL plugin
- Configurar `JWT_SECRET`
- Deploy automático

### 2. Frontend atualizar API URL

Em `frontend/api.js`, mude:

```javascript
const API_BASE = 'https://seu-app.railway.app/api'
```

### 3. Push para produção

```bash
git add .
git commit -m "feat: Integrate backend API"
git push origin main
```

---

✨ **Integração Completa!** 🎉
