// ===== CONSTANTS =====
const CATS = {
  moradia: { e: '🏠', bg: '#3D0F14' },
  alimentacao: { e: '🍽️', bg: '#3D2A0A' },
  saude: { e: '🏥', bg: '#0D2040' },
  transporte: { e: '🚗', bg: '#1F1540' },
  lazer: { e: '🎮', bg: '#0F3D25' },
  educacao: { e: '📚', bg: '#1F1540' },
  tecnologia: { e: '💻', bg: '#0D2040' },
  financeiro: { e: '💳', bg: '#3D0F14' },
  outros: { e: '📦', bg: '#2A3050' }
};

let currentUser = null;
let allBills = [];
let currentFilter = 'all';
let resetToken = null;

// ===== UTILS =====
function fmt(v) { 
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); 
}

function showToast(msg) { 
  const t = document.getElementById('toast'); 
  t.textContent = msg; 
  t.classList.add('show'); 
  setTimeout(() => t.classList.remove('show'), 2800); 
}

function escapeHtml(text) { 
  if (!text) return ''; 
  const div = document.createElement('div'); 
  div.textContent = text; 
  return div.innerHTML; 
}

function closeModal() { 
  document.getElementById('modal').style.display = 'none'; 
  const modals = document.querySelectorAll('.modal-overlay'); 
  modals.forEach(m => { 
    if (m !== document.getElementById('modal').querySelector('.modal-overlay')) m.remove(); 
  }); 
}

// ===== THEME =====
function initTheme() {
  const saved = localStorage.getItem('tobby_theme') || 'dark';
  document.body.classList.toggle('light-theme', saved === 'light');
  updateThemeIcon(saved);
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme');
  const newTheme = isLight ? 'dark' : 'light';
  document.body.classList.toggle('light-theme', newTheme === 'light');
  localStorage.setItem('tobby_theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// ===== SCREENS =====
function showScreen(id) { 
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
  document.getElementById(id).classList.add('active'); 
}

function showLogin() { 
  document.getElementById('login-card').style.display = 'block'; 
  document.getElementById('register-card').style.display = 'none'; 
  document.getElementById('forgot-card').style.display = 'none'; 
  document.getElementById('reset-card').style.display = 'none'; 
}

function showRegister() { 
  document.getElementById('login-card').style.display = 'none'; 
  document.getElementById('register-card').style.display = 'block'; 
  document.getElementById('forgot-card').style.display = 'none'; 
  document.getElementById('reset-card').style.display = 'none'; 
}

function showForgotPassword() { 
  document.getElementById('login-card').style.display = 'none'; 
  document.getElementById('register-card').style.display = 'none'; 
  document.getElementById('forgot-card').style.display = 'block'; 
  document.getElementById('reset-card').style.display = 'none'; 
}

// ===== AUTH =====
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pwd = document.getElementById('login-pwd').value;
  if (!email || !pwd) { showToast('Preencha e-mail e senha'); return; }
  try {
    const user = await api.login(email, pwd);
    currentUser = user;
    document.getElementById('login-err').style.display = 'none';
    enterApp();
  } catch (e) {
    const errDiv = document.getElementById('login-err');
    errDiv.style.display = 'block';
    errDiv.textContent = e.message || 'E-mail ou senha inválidos';
  }
}

async function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pwd = document.getElementById('reg-pwd').value;
  const salary = parseFloat(document.getElementById('reg-salary').value) || 0;
  if (!name || !email || !pwd) { showToast('Preencha todos os campos'); return; }
  try {
    const user = await api.register(name, email, pwd, salary);
    currentUser = user;
    enterApp();
  } catch (e) {
    const errDiv = document.getElementById('reg-err');
    errDiv.style.display = 'block';
    errDiv.textContent = e.message || 'Erro ao criar conta';
  }
}

async function doForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showToast('Digite seu e-mail'); return; }
  try {
    const data = await api.forgotPassword(email);
    const successDiv = document.getElementById('forgot-success');
    successDiv.style.display = 'block';
    successDiv.innerHTML = '📧 ' + data.message;
    setTimeout(() => showLogin(), 3000);
  } catch (e) {
    document.getElementById('forgot-err').style.display = 'block';
    document.getElementById('forgot-err').textContent = e.message;
  }
}

async function doResetPassword() {
  const newPassword = document.getElementById('reset-pwd').value;
  const confirmPassword = document.getElementById('reset-pwd-confirm').value;
  if (!newPassword || !confirmPassword) { showToast('Preencha ambos os campos'); return; }
  if (newPassword !== confirmPassword) { showToast('Senhas não coincidem'); return; }
  if (newPassword.length < 6) { showToast('Mínimo 6 caracteres'); return; }
  try {
    await api.resetPassword(resetToken, newPassword);
    alert('✅ Senha redefinida com sucesso!');
    window.history.replaceState({}, document.title, window.location.pathname);
    showLogin();
  } catch (e) {
    showToast(e.message || 'Erro ao redefinir');
  }
}

function doLogout() {
  api.clearToken();
  currentUser = null;
  showScreen('auth');
  showLogin();
}

function updateUserUI() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('top-avatar').textContent = initials;
  document.getElementById('prof-av').textContent = initials;
  document.getElementById('prof-name').textContent = currentUser.name;
  document.getElementById('prof-email').textContent = currentUser.email;
  document.getElementById('prof-salary').textContent = fmt(currentUser.salary);
}

async function enterApp() {
  showScreen('app');
  updateUserUI();
  navTo('home');
}

// ===== NAVIGATION =====
const TABS = ['home', 'bills', 'investments', 'loans', 'wealth', 'ai', 'profile'];

function navTo(tab) {
  TABS.forEach(t => {
    const el = document.getElementById('tab-' + t);
    const nav = document.getElementById('nav-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    if (nav) nav.classList.toggle('active', t === tab);
  });
  if (tab === 'home') loadHome();
  if (tab === 'bills') loadBills();
  if (tab === 'investments') loadInvestments();
  if (tab === 'loans') loadLoans();
  if (tab === 'wealth') loadWealth();
  if (tab === 'ai') loadInsights();
}

// ===== HOME =====
async function loadHome() {
  try {
    const dash = await api.getDashboard();
    const bills = await api.getBills();
    allBills = bills;
    
    const today = new Date();
    document.getElementById('bal-date').textContent = `Saldo em ${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })}`;
    document.getElementById('bal-free').textContent = fmt(dash.freeBalance);
    document.getElementById('bal-in').textContent = fmt(dash.salary);
    document.getElementById('bal-out').textContent = fmt(dash.totalPaid || 0);
    document.getElementById('bal-pct').textContent = (dash.percentageCommitted || 0) + '%';
    document.getElementById('stat-paid').textContent = dash.paidBills || 0;
    document.getElementById('stat-pend').textContent = dash.pendingBills || 0;
    document.getElementById('stat-late').textContent = dash.lateBills || 0;
    document.getElementById('stat-total').textContent = dash.totalBills || 0;
    
    if (dash.salary !== undefined && currentUser) currentUser.salary = dash.salary;
    
    const paidBills = bills.filter(b => b.status === 'paid');
    const totalPaid = paidBills.reduce((s, b) => s + b.value, 0);
    const avgDaily = totalPaid / 30;
    document.getElementById('daily-avg').textContent = fmt(avgDaily);
    document.getElementById('safe-balance').textContent = fmt(dash.freeBalance * 0.7);
    
    updateTobyMood(dash);
    updateCategoryChart(bills);
    renderHomeBills(bills);
  } catch (e) { console.error(e); }
}

function updateTobyMood(dash) {
  const free = dash.freeBalance || 0;
  const late = dash.lateBills || 0;
  let avatar = '🐶', msg = '', badge = '🐶';
  if (late > 0) { avatar = '😟'; msg = `Você tem ${late} conta(s) atrasada(s). Vamos resolver?`; badge = 'Preocupado'; }
  else if (free < 500 && free > 0) { avatar = '🧐'; msg = `Saldo livre de ${fmt(free)}. Vamos com cuidado!`; badge = 'Atento'; }
  else if (free > 2000) { avatar = '😊'; msg = `${fmt(free)} livres! Você está indo muito bem!`; badge = 'Feliz'; }
  else { avatar = '🐶'; msg = 'Tudo dentro do esperado. Continue assim!'; badge = 'Normal'; }
  document.getElementById('toby-avatar').textContent = avatar;
  document.getElementById('toby-message').textContent = msg;
  document.getElementById('toby-badge').textContent = badge;
}

function updateCategoryChart(bills) {
  const categories = {};
  bills.filter(b => b.status === 'paid').forEach(b => {
    const cat = b.category || 'outros';
    categories[cat] = (categories[cat] || 0) + b.value;
  });
  const total = Object.values(categories).reduce((s, v) => s + v, 0);
  const legendDiv = document.getElementById('category-legend');
  if (total === 0) { legendDiv.innerHTML = '<div style="font-size: 12px; color: var(--text-muted)">Nenhuma despesa registrada</div>'; return; }
  const colors = { moradia: '#3B82F6', alimentacao: '#10B981', saude: '#8B5CF6', transporte: '#F59E0B', lazer: '#EC4899', educacao: '#06B6D4', tecnologia: '#6366F1', financeiro: '#EF4444', outros: '#6B7280' };
  legendDiv.innerHTML = Object.entries(categories).slice(0, 5).map(([cat, val]) => `<div class="legend-item"><div class="legend-color" style="background: ${colors[cat] || '#6B7280'}"></div><div class="legend-label">${cat}</div><div class="legend-value">${fmt(val)}</div><div style="font-size: 11px; color: var(--text-muted)">${Math.round((val / total) * 100)}%</div></div>`).join('');
}

function renderHomeBills(bills) {
  const today = new Date().getDate();
  const upcoming = bills.filter(b => b.status === 'pending' || b.status === 'late').sort((a, b) => a.due_day - b.due_day).slice(0, 5);
  const el = document.getElementById('home-bills-list');
  if (!upcoming.length) { el.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: var(--text-secondary)">Sem contas pendentes 🎉</div>'; return; }
  el.innerHTML = upcoming.map(b => {
    const cat = CATS[b.category] || CATS.outros;
    const isLate = b.status === 'late' || (b.status === 'pending' && b.due_day < today);
    return `<div class="transaction-item" onclick="navTo('bills')"><div class="transaction-icon" style="background: ${cat.bg}">${cat.e}</div><div class="transaction-info"><div class="transaction-name">${b.name}</div><div class="transaction-meta">${isLate ? 'Atrasada' : 'Vence dia ' + b.due_day}</div></div><div class="transaction-right"><div class="transaction-value expense">${fmt(b.value)}</div><div class="transaction-status ${isLate ? 'status-late' : 'status-pending'}">${isLate ? 'Atrasado' : 'Pendente'}</div></div></div>`;
  }).join('');
}

// ===== BILLS =====
async function loadBills() {
  try {
    const bills = await api.getBills(currentFilter === 'all' ? null : currentFilter);
    allBills = bills;
    renderBills();
  } catch (e) { showToast('Erro ao carregar contas'); }
}

function filterBills(el, filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  loadBills();
}

function renderBills() {
  const today = new Date().getDate();
  let bills = [...allBills];
  if (currentFilter === 'pending') bills = bills.filter(b => b.status === 'pending');
  else if (currentFilter === 'paid') bills = bills.filter(b => b.status === 'paid');
  else if (currentFilter === 'late') bills = bills.filter(b => b.status === 'late' || (b.status === 'pending' && b.due_day < today));
  const el = document.getElementById('bills-list-main');
  if (!bills.length) { el.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary)">Nenhuma transação encontrada</div>'; return; }
  el.innerHTML = bills.map(b => {
    const cat = CATS[b.category] || CATS.outros;
    const isLate = b.status === 'pending' && b.due_day < today;
    const statusClass = b.status === 'paid' ? 'status-paid' : (isLate ? 'status-late' : 'status-pending');
    const statusText = b.status === 'paid' ? 'Pago' : (isLate ? 'Atrasado' : 'Pendente');
    return `<div class="transaction-item"><div class="transaction-icon" style="background: ${cat.bg}">${cat.e}</div><div class="transaction-info"><div class="transaction-name">${b.name}</div><div class="transaction-meta">${b.due_day} de cada mês · ${b.category}</div></div><div class="transaction-right"><div class="transaction-value expense">${fmt(b.value)}</div><div class="transaction-status ${statusClass}">${statusText}</div></div><div class="transaction-actions"><div class="transaction-action" onclick="event.stopPropagation(); toggleStatus('${b.id}','${b.status}')">${b.status === 'paid' ? '↩️' : '✅'}</div><div class="transaction-action" onclick="event.stopPropagation(); openBillModal('${b.id}')">✏️</div><div class="transaction-action" onclick="event.stopPropagation(); deleteBill('${b.id}')">🗑️</div></div></div>`;
  }).join('');
}

function openBillModal(id) {
  const modalDiv = document.getElementById('modal');
  if (id) {
    const b = allBills.find(x => x.id == id);
    if (!b) return;
    document.getElementById('modal-title').textContent = 'Editar Conta';
    document.getElementById('f-id').value = b.id;
    document.getElementById('f-name').value = b.name;
    document.getElementById('f-val').value = b.value;
    document.getElementById('f-day').value = b.due_day;
    document.getElementById('f-cat').value = b.category;
    document.getElementById('f-status').value = b.status;
  } else {
    document.getElementById('modal-title').textContent = 'Nova Conta';
    document.getElementById('f-id').value = '';
    document.getElementById('f-name').value = '';
    document.getElementById('f-val').value = '';
    document.getElementById('f-day').value = '';
    document.getElementById('f-cat').value = 'outros';
    document.getElementById('f-status').value = 'pending';
  }
  modalDiv.style.display = 'block';
}

async function saveBill() {
  const name = document.getElementById('f-name').value.trim();
  const value = parseFloat(document.getElementById('f-val').value);
  const due_day = parseInt(document.getElementById('f-day').value);
  if (!name || !value || !due_day) { showToast('Preencha todos os campos'); return; }
  const category = document.getElementById('f-cat').value;
  const status = document.getElementById('f-status').value;
  const eid = document.getElementById('f-id').value;
  try {
    if (eid) await api.updateBill(eid, name, value, due_day, category, status);
    else await api.createBill(name, value, due_day, category, status);
    closeModal();
    await loadBills();
    await loadHome();
    showToast('Conta salva com sucesso 🐶');
  } catch (e) { showToast(e.message || 'Erro ao salvar'); }
}

async function deleteBill(id) {
  if (!confirm('Remover esta conta?')) return;
  try {
    await api.deleteBill(id);
    await loadBills();
    await loadHome();
    showToast('Conta removida');
  } catch (e) { showToast('Erro ao remover'); }
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
  try {
    await api.updateBillStatus(id, newStatus);
    await loadBills();
    await loadHome();
    showToast(newStatus === 'paid' ? '✅ Marcada como paga' : '↩️ Marcada como pendente');
  } catch (e) { showToast('Erro ao atualizar'); }
}

// ===== INVESTMENTS =====
async function loadInvestments() {
  try {
    const data = await api.getInvestments();
    const investments = data.investments || [];
    const totalInvested = investments.reduce((s, i) => s + (i.quantity * i.purchase_price), 0);
    const totalCurrent = investments.reduce((s, i) => s + (i.quantity * (i.current_price || i.purchase_price)), 0);
    document.getElementById('total-invested').textContent = fmt(totalInvested);
    document.getElementById('current-value').textContent = fmt(totalCurrent);
    const container = document.getElementById('investments-list-container');
    if (!investments.length) { container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary)">Nenhum investimento cadastrado</div>'; return; }
    container.innerHTML = investments.map(inv => `<div class="transaction-item"><div class="transaction-icon">${inv.asset_type === 'crypto' ? '₿' : '📈'}</div><div class="transaction-info"><div class="transaction-name">${inv.symbol}</div><div class="transaction-meta">${inv.quantity} unidades · Preço: ${fmt(inv.purchase_price)}</div></div><div class="transaction-right"><div class="transaction-value">${fmt(inv.quantity * (inv.current_price || inv.purchase_price))}</div><div class="transaction-action" onclick="deleteInvestment('${inv.id}')">🗑️</div></div></div>`).join('');
  } catch (e) { console.error(e); }
}

async function deleteInvestment(id) {
  if (!confirm('Remover este investimento?')) return;
  try { await api.deleteInvestment(id); loadInvestments(); showToast('Investimento removido'); } catch (e) { showToast('Erro ao remover'); }
}

function showAddInvestmentModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal"><div class="modal-handle"></div><h3>➕ Adicionar Investimento</h3><div class="field"><label>Símbolo</label><input type="text" id="inv-symbol" placeholder="PETR4, BTC, ITSA4"></div><div class="field"><label>Tipo</label><select id="inv-type"><option value="stock">Ação (B3)</option><option value="crypto">Criptomoeda</option><option value="fii">FII</option></select></div><div class="field-row"><div class="field"><label>Quantidade</label><input type="number" id="inv-quantity" step="0.00001"></div><div class="field"><label>Preço médio (R$)</label><input type="number" id="inv-price" step="0.01"></div></div><div class="field"><label>Data da compra</label><input type="date" id="inv-date"></div><div style="display:flex;gap:0.5rem;margin-top:1rem"><button class="btn-primary" style="flex:1" onclick="saveInvestment()">Salvar</button><button class="btn-secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove()">Cancelar</button></div></div>`;
  document.body.appendChild(modal);
}

async function saveInvestment() {
  const symbol = document.getElementById('inv-symbol').value.toUpperCase();
  const quantity = parseFloat(document.getElementById('inv-quantity').value);
  const price = parseFloat(document.getElementById('inv-price').value);
  const date = document.getElementById('inv-date').value;
  const assetType = document.getElementById('inv-type').value;
  if (!symbol || !quantity || !price || !date) { showToast('Preencha todos os campos'); return; }
  try {
    await api.createInvestment({ symbol, quantity, purchasePrice: price, purchaseDate: date, assetType });
    showToast('Investimento cadastrado!');
    document.querySelector('.modal-overlay')?.remove();
    loadInvestments();
  } catch (e) { showToast(e.message || 'Erro ao cadastrar'); }
}

// ===== LOANS =====
async function loadLoans() {
  try {
    const data = await api.getLoans();
    const loans = data.loans || [];
    const summary = data.summary || { totalDebt: 0, totalMonthlyPayment: 0 };
    document.getElementById('total-debt').textContent = fmt(summary.totalDebt);
    document.getElementById('total-monthly').textContent = fmt(summary.totalMonthlyPayment);
    const container = document.getElementById('loans-list-container');
    if (!loans.length) { container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary)">Nenhum financiamento cadastrado</div>'; return; }
    container.innerHTML = loans.map(loan => `<div class="transaction-item"><div class="transaction-icon">🏠</div><div class="transaction-info"><div class="transaction-name">${loan.name}</div><div class="transaction-meta">${loan.remaining_installments} parcelas · ${loan.interest_rate}% a.m.</div></div><div class="transaction-right"><div class="transaction-value expense">${fmt(loan.outstanding_balance)}</div><div class="transaction-action" onclick="deleteLoan('${loan.id}')">🗑️</div></div></div>`).join('');
  } catch (e) { console.error(e); }
}

async function deleteLoan(id) {
  if (!confirm('Remover este financiamento?')) return;
  try { await api.deleteLoan(id); loadLoans(); showToast('Financiamento removido'); } catch (e) { showToast('Erro ao remover'); }
}

function showAddLoanModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal"><div class="modal-handle"></div><h3>➕ Adicionar Financiamento</h3><div class="field"><label>Nome</label><input type="text" id="loan-name" placeholder="Ex: Financiamento Casa"></div><div class="field"><label>Tipo</label><select id="loan-type"><option value="mortgage">Financiamento Imobiliário</option><option value="car">Financiamento Veículo</option><option value="personal">Empréstimo Pessoal</option></select></div><div class="field-row"><div class="field"><label>Valor Total</label><input type="number" id="loan-total" step="0.01"></div><div class="field"><label>Saldo Devedor</label><input type="number" id="loan-balance" step="0.01"></div></div><div class="field-row"><div class="field"><label>Taxa Juros (% mês)</label><input type="number" id="loan-rate" step="0.01"></div><div class="field"><label>Parcelas Restantes</label><input type="number" id="loan-installments"></div></div><div class="field"><label>Data Início</label><input type="date" id="loan-date"></div><div style="display:flex;gap:0.5rem;margin-top:1rem"><button class="btn-primary" style="flex:1" onclick="saveLoan()">Salvar</button><button class="btn-secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove()">Cancelar</button></div></div>`;
  document.body.appendChild(modal);
}

async function saveLoan() {
  const name = document.getElementById('loan-name').value;
  const type = document.getElementById('loan-type').value;
  const totalPrincipal = parseFloat(document.getElementById('loan-total').value);
  const outstandingBalance = parseFloat(document.getElementById('loan-balance').value);
  const interestRate = parseFloat(document.getElementById('loan-rate').value);
  const remainingInstallments = parseInt(document.getElementById('loan-installments').value);
  const startDate = document.getElementById('loan-date').value;
  if (!name || !totalPrincipal || !outstandingBalance || !interestRate || !remainingInstallments || !startDate) { showToast('Preencha todos os campos'); return; }
  try {
    await api.createLoan({ name, type, totalPrincipal, outstandingBalance, interestRate, remainingInstallments, startDate });
    showToast('Financiamento cadastrado!');
    document.querySelector('.modal-overlay')?.remove();
    loadLoans();
  } catch (e) { showToast(e.message); }
}

// ===== WEALTH =====
async function loadWealth() {
  try {
    const summary = await api.getWealthSummary();
    const wealthSummary = summary.summary || {};
    document.getElementById('net-worth').textContent = fmt(wealthSummary.netWorth || 0);
    document.getElementById('total-assets').textContent = fmt(wealthSummary.totalAssets || 0);
    document.getElementById('total-liabilities').textContent = fmt(wealthSummary.totalLiabilities || 0);
    const assets = await api.getAssets();
    const assetsList = assets.assets || [];
    const container = document.getElementById('assets-list-container');
    if (!assetsList.length) { container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--text-secondary)">Nenhum bem cadastrado</div>'; return; }
    container.innerHTML = assetsList.map(a => `<div class="transaction-item"><div class="transaction-icon">🏠</div><div class="transaction-info"><div class="transaction-name">${a.name}</div><div class="transaction-meta">${a.asset_type === 'real_estate' ? 'Imóvel' : a.asset_type === 'vehicle' ? 'Veículo' : 'Outro'}</div></div><div class="transaction-right"><div class="transaction-value">${fmt(a.estimated_value)}</div><div class="transaction-action" onclick="deleteAsset('${a.id}')">🗑️</div></div></div>`).join('');
  } catch (e) { showToast('Erro ao carregar patrimônio'); }
}

async function deleteAsset(id) {
  if (!confirm('Remover este bem?')) return;
  try { await api.deleteAsset(id); loadWealth(); showToast('Bem removido'); } catch (e) { showToast('Erro ao remover'); }
}

function showAddAssetModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal"><div class="modal-handle"></div><h3>➕ Adicionar Bem</h3><div class="field"><label>Nome</label><input type="text" id="asset-name" placeholder="Ex: Apartamento, Carro"></div><div class="field"><label>Tipo</label><select id="asset-type"><option value="real_estate">Imóvel</option><option value="vehicle">Veículo</option><option value="savings">Reserva Financeira</option><option value="other">Outro</option></select></div><div class="field"><label>Valor Estimado (R$)</label><input type="number" id="asset-value" step="0.01"></div><div style="display:flex;gap:0.5rem;margin-top:1rem"><button class="btn-primary" style="flex:1" onclick="saveAsset()">Salvar</button><button class="btn-secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove()">Cancelar</button></div></div>`;
  document.body.appendChild(modal);
}

async function saveAsset() {
  const name = document.getElementById('asset-name').value;
  const assetType = document.getElementById('asset-type').value;
  const estimatedValue = parseFloat(document.getElementById('asset-value').value);
  if (!name || !estimatedValue) { showToast('Preencha todos os campos'); return; }
  try {
    await api.createAsset({ name, assetType, estimatedValue });
    showToast('Bem cadastrado!');
    document.querySelector('.modal-overlay')?.remove();
    loadWealth();
  } catch (e) { showToast(e.message || 'Erro ao cadastrar bem'); }
}

// ===== INSIGHTS =====
function loadInsights() {
  const bills = allBills;
  const salary = currentUser?.salary || 0;
  const today = new Date().getDate();
  const late = bills.filter(b => b.status === 'late' || (b.status === 'pending' && b.due_day < today));
  const free = salary - bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.value, 0);
  const pct = salary > 0 ? Math.round((bills.reduce((s, b) => s + b.value, 0) / salary) * 100) : 0;
  const el = document.getElementById('insights-list');
  if (!bills.length) { el.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--text-secondary)">Cadastre contas para receber análises</div>'; return; }
  let cards = [];
  if (late.length > 0) cards.push(`<div class="indicator-card" style="text-align:left; cursor:pointer" onclick="navTo('bills')"><div class="indicator-label">⚠️ Contas atrasadas</div><div class="indicator-value small" style="color: var(--red)">${late.length} conta(s)</div><div style="font-size: 10px; color: var(--text-muted)">Regularize para evitar juros</div></div>`);
  if (pct > 70) cards.push(`<div class="indicator-card" style="text-align:left" onclick="navTo('bills')"><div class="indicator-label">📊 Comprometimento</div><div class="indicator-value small" style="color: var(--orange)">${pct}% da renda</div><div style="font-size: 10px; color: var(--text-muted)">Ideal é abaixo de 50%</div></div>`);
  if (free > 500) cards.push(`<div class="indicator-card" style="text-align:left" onclick="navTo('investments')"><div class="indicator-label">💰 Saldo disponível</div><div class="indicator-value small" style="color: var(--green)">${fmt(free)}</div><div style="font-size: 10px; color: var(--text-muted)">Considere investir!</div></div>`);
  if (!cards.length) cards.push(`<div class="indicator-card" style="text-align:left" onclick="navTo('bills')"><div class="indicator-label">🐶 Continue assim!</div><div class="indicator-value small">${bills.length} contas cadastradas</div><div style="font-size: 10px; color: var(--text-muted)">Adicione mais contas para melhores análises</div></div>`);
  el.innerHTML = `<div class="stats-grid" style="grid-template-columns: 1fr; gap: 0.5rem">${cards.map(c => `<div class="stat-card">${c}</div>`).join('')}</div>`;
}

// ===== CHAT COM IA (via backend) =====
async function sendMsg() {
  const input = document.getElementById('chat-input');
  const q = input.value.trim();
  if (!q) return;
  
  input.value = '';
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML += `<div class="msg msg-user">${escapeHtml(q)}</div>`;
  msgs.scrollTop = msgs.scrollHeight;
  document.getElementById('typing-ind').style.display = 'block';
  
  try {
    const pendingBills = allBills.filter(b => b.status === 'pending').length;
    const lateBills = allBills.filter(b => b.status === 'late').length;
    
    const response = await api.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: q,
        context: {
          salary: currentUser?.salary || 0,
          billsCount: allBills.length,
          pendingBills: pendingBills,
          lateBills: lateBills
        }
      })
    });
    
    const reply = response.reply || 'Desculpe, não consegui processar sua mensagem.';
    document.getElementById('typing-ind').style.display = 'none';
    msgs.innerHTML += `<div class="msg msg-ai"><span class="msg-ai-label">✦ TOBBY IA</span>${escapeHtml(reply)}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
    
  } catch (e) {
    console.error('Erro no chat:', e);
    document.getElementById('typing-ind').style.display = 'none';
    msgs.innerHTML += `<div class="msg msg-ai"><span class="msg-ai-label">✦ TOBBY IA</span>⚠️ Erro de conexão. Tente novamente.</div>`;
  }
}

// ===== PROFILE =====
async function editSalary() {
  const cur = currentUser?.salary || 0;
  const novo = prompt('Informe seu salário mensal (R$):', cur);
  if (novo === null) return;
  const val = parseFloat(novo);
  if (isNaN(val) || val < 0) { showToast('Valor inválido'); return; }
  try {
    const updated = await api.updateSalary(val);
    currentUser.salary = updated.salary;
    document.getElementById('prof-salary').textContent = fmt(updated.salary);
    loadHome();
    showToast('Salário atualizado 💰');
  } catch (e) { showToast('Erro ao atualizar salário'); }
}

// ===== UTILITIES =====
function openReceiptScanner() { showToast('📸 Câmera - Funcionalidade em desenvolvimento'); }

function showHollerithModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal"><div class="modal-handle"></div><h3>📄 Leitor de Holerite</h3><textarea id="holerite-text" rows="6" placeholder="Cole aqui o texto do seu holerite..."></textarea><div style="display:flex;gap:0.5rem;margin-top:1rem"><button class="btn-primary" style="flex:1" onclick="processHollerith()">Processar</button><button class="btn-secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove()">Cancelar</button></div><div id="holerite-result" style="margin-top:1rem;display:none"></div></div>`;
  document.body.appendChild(modal);
}

async function processHollerith() {
  const text = document.getElementById('holerite-text')?.value;
  if (!text) { showToast('Cole o texto do holerite'); return; }
  try {
    const data = await api.processHollerith(text);
    showToast(data.message);
    document.querySelector('.modal-overlay')?.remove();
    loadHome();
  } catch (e) { showToast(e.message || 'Erro ao processar'); }
}

function showBankExtractModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal"><div class="modal-handle"></div><h3>🏦 Importar Extrato</h3><select id="extract-format"><option value="text">📝 Texto simples</option><option value="csv">📊 CSV</option><option value="ofx">🏦 OFX</option></select><textarea id="extract-text" rows="6" placeholder="Cole aqui o texto do seu extrato..." style="margin-top:1rem"></textarea><div style="display:flex;gap:0.5rem;margin-top:1rem"><button class="btn-primary" style="flex:1" onclick="processBankExtract()">Processar</button><button class="btn-secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove()">Cancelar</button></div></div>`;
  document.body.appendChild(modal);
}

async function processBankExtract() {
  const text = document.getElementById('extract-text')?.value;
  const format = document.getElementById('extract-format')?.value || 'text';
  if (!text) { showToast('Cole o texto do extrato'); return; }
  try {
    const data = await api.processBankExtract(text, format);
    showToast(data.message);
    document.querySelector('.modal-overlay')?.remove();
    loadHome();
  } catch (e) { showToast(e.message || 'Erro ao processar'); }
}

async function showIncomeReport() {
  try {
    const report = await api.request('/hollerith/report');
    alert(`📊 INFORME DE RENDIMENTOS\n\nUsuário: ${report.user}\nAno: ${report.year}\nRendimentos Totais: ${fmt(report.totalIncome)}\nDespesas Dedutíveis: ${fmt(report.totalExpenses)}\nIRRF Retido: ${fmt(report.annualIRRF)}`);
  } catch (e) { showToast('Erro ao gerar informe'); }
}

// ===== INIT =====
function checkResetToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    resetToken = token;
    showScreen('auth');
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('forgot-card').style.display = 'none';
    document.getElementById('reset-card').style.display = 'block';
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const profile = await api.getProfile();
      currentUser = profile;
      enterApp();
    } catch (e) {
      localStorage.removeItem('token');
      showScreen('auth');
      showLogin();
      checkResetToken();
    }
  } else {
    showScreen('auth');
    showLogin();
    checkResetToken();
  }
  document.getElementById('loading').classList.add('hidden');
});

// Exportar funções para o escopo global
window.fmt = fmt;
window.showToast = showToast;
window.closeModal = closeModal;
window.toggleTheme = toggleTheme;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showForgotPassword = showForgotPassword;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.doForgotPassword = doForgotPassword;
window.doResetPassword = doResetPassword;
window.doLogout = doLogout;
window.navTo = navTo;
window.filterBills = filterBills;
window.openBillModal = openBillModal;
window.saveBill = saveBill;
window.deleteBill = deleteBill;
window.toggleStatus = toggleStatus;
window.showAddInvestmentModal = showAddInvestmentModal;
window.saveInvestment = saveInvestment;
window.deleteInvestment = deleteInvestment;
window.showAddLoanModal = showAddLoanModal;
window.saveLoan = saveLoan;
window.deleteLoan = deleteLoan;
window.showAddAssetModal = showAddAssetModal;
window.saveAsset = saveAsset;
window.deleteAsset = deleteAsset;
window.sendMsg = sendMsg;
window.editSalary = editSalary;
window.openReceiptScanner = openReceiptScanner;
window.showHollerithModal = showHollerithModal;
window.processHollerith = processHollerith;
window.showBankExtractModal = showBankExtractModal;
window.processBankExtract = processBankExtract;
window.showIncomeReport = showIncomeReport;