// TOBBY - APP PRINCIPAL
// Versao 7.0

var CATS = {
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

var currentUser = null;
var allBills = [];
var currentFilter = 'all';
var resetToken = null;
var allCategories = [];

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  var modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(function(m) {
    if (m !== document.getElementById('modal').querySelector('.modal-overlay')) m.remove();
  });
}

function initTheme() {
  var saved = localStorage.getItem('tobby_theme') || 'dark';
  document.body.classList.toggle('light-theme', saved === 'light');
  updateThemeIcon(saved);
}

function toggleTheme() {
  var isLight = document.body.classList.contains('light-theme');
  var newTheme = isLight ? 'dark' : 'light';
  document.body.classList.toggle('light-theme', newTheme === 'light');
  localStorage.setItem('tobby_theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  var icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
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

async function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pwd = document.getElementById('login-pwd').value;
  if (!email || !pwd) { showToast('Preencha e-mail e senha'); return; }
  try {
    var user = await api.login(email, pwd);
    currentUser = user;
    document.getElementById('login-err').style.display = 'none';
    enterApp();
  } catch (e) {
    var errDiv = document.getElementById('login-err');
    errDiv.style.display = 'block';
    errDiv.textContent = e.message || 'E-mail ou senha inválidos';
  }
}

async function doRegister() {
  var name = document.getElementById('reg-name').value.trim();
  var email = document.getElementById('reg-email').value.trim();
  var pwd = document.getElementById('reg-pwd').value;
  var salary = parseFloat(document.getElementById('reg-salary').value) || 0;
  if (!name || !email || !pwd) { showToast('Preencha todos os campos'); return; }
  try {
    var user = await api.register(name, email, pwd, salary);
    currentUser = user;
    enterApp();
  } catch (e) {
    var errDiv = document.getElementById('reg-err');
    errDiv.style.display = 'block';
    errDiv.textContent = e.message || 'Erro ao criar conta';
  }
}

async function doForgotPassword() {
  var email = document.getElementById('forgot-email').value.trim();
  if (!email) { showToast('Digite seu e-mail'); return; }
  try {
    var data = await api.forgotPassword(email);
    var successDiv = document.getElementById('forgot-success');
    successDiv.style.display = 'block';
    successDiv.innerHTML = '📧 ' + data.message;
    setTimeout(function() { showLogin(); }, 3000);
  } catch (e) {
    document.getElementById('forgot-err').style.display = 'block';
    document.getElementById('forgot-err').textContent = e.message;
  }
}

async function doResetPassword() {
  var newPassword = document.getElementById('reset-pwd').value;
  var confirmPassword = document.getElementById('reset-pwd-confirm').value;
  if (!newPassword || !confirmPassword) { showToast('Preencha ambos os campos'); return; }
  if (newPassword !== confirmPassword) { showToast('Senhas não coincidem'); return; }
  if (newPassword.length < 6) { showToast('Mínimo 6 caracteres'); return; }
  try {
    await api.resetPassword(resetToken, newPassword);
    alert('Senha redefinida com sucesso!');
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
  var initials = currentUser.name.split(' ').map(function(x) { return x[0]; }).join('').substring(0, 2).toUpperCase();
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

var TABS = ['home', 'bills', 'investments', 'loans', 'wealth', 'ai', 'profile'];

function navTo(tab) {
  TABS.forEach(function(t) {
    var el = document.getElementById('tab-' + t);
    var nav = document.getElementById('nav-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    if (nav) nav.classList.toggle('active', t === tab);
  });
  if (tab === 'home') {
    loadHome();
    loadFinancialScore();
    loadEmergencyFund();
    loadGoals();
  }
  if (tab === 'bills') loadBills();
  if (tab === 'investments') loadInvestments();
  if (tab === 'loans') loadLoans();
  if (tab === 'wealth') loadWealth();
  if (tab === 'ai') {
    loadInsights();
    showPrivacyMessage();
  }
  if (tab === 'profile') {
    loadCategories();
  }
}

async function loadFinancialScore() {
  try {
    var response = await api.request('/score');
    if (response.score) {
      document.getElementById('score-value').innerHTML = response.score + '<span style="font-size: 14px;">/100</span>';
      document.getElementById('score-label').innerHTML = response.classification.name;
      document.getElementById('score-bar').style.width = response.score + '%';
      if (response.score >= 90) document.getElementById('score-emoji').innerHTML = '🏆';
      else if (response.score >= 70) document.getElementById('score-emoji').innerHTML = '😊';
      else if (response.score >= 50) document.getElementById('score-emoji').innerHTML = '🐶';
      else if (response.score >= 30) document.getElementById('score-emoji').innerHTML = '🧐';
      else document.getElementById('score-emoji').innerHTML = '😟';
    }
  } catch (error) {
    console.error('Erro ao carregar score:', error);
  }
}

async function loadEmergencyFund() {
  try {
    var response = await api.request('/emergency-fund');
    if (response) {
      document.getElementById('emergency-amount').innerHTML = fmt(response.current_amount);
      document.getElementById('emergency-months').innerHTML = response.months_of_safety + ' meses';
      document.getElementById('emergency-progress').style.width = response.progress + '%';
      document.getElementById('emergency-recommended').innerHTML = 'Recomendado: ' + fmt(response.recommended_amount);
    }
  } catch (error) {
    console.error('Erro ao carregar reserva:', error);
  }
}

async function loadGoals() {
  try {
    var response = await api.request('/goals/goals');
    var goals = response.goals || [];
    var container = document.getElementById('goals-list');
    if (goals.length === 0) {
      container.innerHTML = '<div class="stat-card" style="text-align: center; cursor: pointer;" onclick="openGoalModal()"><div style="font-size: 24px; margin-bottom: 8px;">🎯</div><div style="font-size: 13px; color: var(--text-secondary);">Crie sua primeira meta!</div><div style="font-size: 11px; color: var(--green); margin-top: 4px;">Clique para adicionar →</div></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < goals.length; i++) {
      var goal = goals[i];
      var progress = goal.progress || 0;
      var remaining = goal.remaining || 0;
      var monthlyNeeded = goal.monthly_needed || 0;
      html += '<div class="stat-card" style="margin-bottom: 0.5rem;">';
      html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
      html += '<div><div style="font-weight: 700;">' + escapeHtml(goal.name) + '</div>';
      html += '<div style="font-size: 10px; color: var(--text-muted);">' + new Date(goal.deadline).toLocaleDateString('pt-BR') + '</div></div>';
      html += '<div style="text-align: right;"><div style="font-weight: 700;">' + fmt(goal.current_amount) + '</div>';
      html += '<div style="font-size: 10px; color: var(--text-muted);">de ' + fmt(goal.target_amount) + '</div></div></div>';
      html += '<div style="height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-bottom: 8px;"><div style="width: ' + progress + '%; height: 100%; background: var(--green); border-radius: 3px;"></div></div>';
      html += '<div style="display: flex; justify-content: space-between; font-size: 10px;"><span>' + progress.toFixed(0) + '% concluído</span><span>Faltam ' + fmt(remaining) + '</span></div>';
      if (monthlyNeeded > 0) html += '<div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">💰 Precisaria de ' + fmt(monthlyNeeded) + '/mês</div>';
      html += '<div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">';
      html += '<button class="chip" onclick="event.stopPropagation(); updateGoalProgress(\'' + goal.id + '\')" style="font-size: 10px;">📈 Atualizar</button>';
      html += '<button class="chip" onclick="event.stopPropagation(); deleteGoal(\'' + goal.id + '\')" style="font-size: 10px; background: var(--red-bg);">🗑️ Remover</button>';
      html += '</div></div>';
    }
    container.innerHTML = html;
  } catch (error) {
    console.error('Erro ao carregar metas:', error);
  }
}

function openGoalModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal"><div class="modal-handle"></div><h3>🎯 Nova Meta Financeira</h3><div class="field"><label>Nome da meta</label><input type="text" id="goal-name" placeholder="Ex: Comprar moto, Viagem, Casa própria"></div><div class="field"><label>Valor alvo (R$)</label><input type="number" id="goal-target" step="0.01" placeholder="0,00"></div><div class="field"><label>Valor já guardado (R$)</label><input type="number" id="goal-current" step="0.01" placeholder="0,00" value="0"></div><div class="field"><label>Data limite</label><input type="date" id="goal-deadline"></div><div style="display: flex; gap: 0.5rem; margin-top: 1rem"><button class="btn-primary" style="flex: 1" onclick="saveGoal()">Salvar meta</button><button class="btn-secondary" style="flex: 1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button></div></div>';
  document.body.appendChild(modal);
}

async function saveGoal() {
  var name = document.getElementById('goal-name').value;
  var target_amount = parseFloat(document.getElementById('goal-target').value);
  var current_amount = parseFloat(document.getElementById('goal-current').value) || 0;
  var deadline = document.getElementById('goal-deadline').value;
  if (!name || !target_amount || !deadline) { showToast('Preencha todos os campos'); return; }
  try {
    await api.request('/goals/goals', { method: 'POST', body: JSON.stringify({ name: name, target_amount: target_amount, current_amount: current_amount, deadline: deadline }) });
    showToast('Meta criada com sucesso! 🎯');
    document.querySelector('.modal-overlay').remove();
    loadGoals();
  } catch (error) {
    showToast('Erro ao criar meta');
  }
}

async function updateGoalProgress(goalId) {
  var newAmount = prompt('Digite o novo valor guardado (R$):');
  if (newAmount === null) return;
  var current_amount = parseFloat(newAmount);
  if (isNaN(current_amount)) { showToast('Valor inválido'); return; }
  try {
    await api.request('/goals/goals/' + goalId, { method: 'PUT', body: JSON.stringify({ current_amount: current_amount }) });
    showToast('Progresso atualizado! 📈');
    loadGoals();
  } catch (error) {
    showToast('Erro ao atualizar progresso');
  }
}

async function deleteGoal(goalId) {
  if (!confirm('Tem certeza que deseja remover esta meta?')) return;
  try {
    await api.request('/goals/goals/' + goalId, { method: 'DELETE' });
    showToast('Meta removida');
    loadGoals();
  } catch (error) {
    showToast('Erro ao remover meta');
  }
}

async function loadCategories() {
  try {
    var response = await api.request('/categories');
    allCategories = response.categories || [];
    var container = document.getElementById('categories-list');
    if (!container) return;
    if (allCategories.length === 0) {
      container.innerHTML = '<div class="stat-card" style="text-align: center; cursor: pointer;" onclick="openCategoryModal()"><div style="font-size: 24px; margin-bottom: 8px;">🏷️</div><div style="font-size: 13px; color: var(--text-secondary);">Crie suas próprias categorias!</div><div style="font-size: 11px; color: var(--green); margin-top: 4px;">Clique para adicionar →</div></div>';
      return;
    }
    var defaultCats = allCategories.filter(function(c) { return c.is_default === true; });
    var userCats = allCategories.filter(function(c) { return c.is_default === false; });
    var html = '';
    if (userCats.length > 0) {
      html += '<div style="margin-bottom: 0.5rem;"><strong>📝 Minhas Categorias</strong></div>';
      for (var i = 0; i < userCats.length; i++) {
        var cat = userCats[i];
        html += '<div class="transaction-item" style="padding: 0.75rem;">';
        html += '<div class="transaction-icon" style="background: ' + (cat.color || '#6B7280') + '20; width: 40px; height: 40px;">' + (cat.emoji || '📦') + '</div>';
        html += '<div class="transaction-info" style="flex: 1;"><div class="transaction-name">' + escapeHtml(cat.name) + '</div><div class="transaction-meta">Personalizada</div></div>';
        html += '<div class="transaction-actions">';
        html += '<div class="transaction-action" onclick="event.stopPropagation(); editCategory(\'' + cat.id + '\', \'' + escapeHtml(cat.name) + '\', \'' + (cat.emoji || '📦') + '\', \'' + (cat.color || '#6B7280') + '\')">✏️</div>';
        html += '<div class="transaction-action" onclick="event.stopPropagation(); deleteCategory(\'' + cat.id + '\')">🗑️</div>';
        html += '</div></div>';
      }
    }
    if (defaultCats.length > 0) {
      html += '<div style="margin-top: 0.75rem; margin-bottom: 0.5rem;"><strong>⭐ Categorias Padrão</strong></div>';
      html += '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">';
      for (var j = 0; j < defaultCats.length; j++) {
        var defCat = defaultCats[j];
        html += '<div class="category-badge" style="background: ' + (defCat.color || '#6B7280') + '20; border: 1px solid ' + (defCat.color || '#6B7280') + '30;"><span>' + (defCat.emoji || '📦') + '</span><span style="font-size: 12px;">' + escapeHtml(defCat.name) + '</span></div>';
      }
      html += '</div>';
    }
    container.innerHTML = html;
    loadCategoryOptions();
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
  }
}

function openCategoryModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal"><div class="modal-handle"></div><h3>🏷️ Nova Categoria</h3><div class="field"><label>Nome da categoria</label><input type="text" id="cat-name" placeholder="Ex: Pet, Farmácia, Academia"></div><div class="field-row"><div class="field"><label>Emoji</label><input type="text" id="cat-emoji" placeholder="🐶" maxlength="2" value="📦"></div><div class="field"><label>Cor</label><input type="color" id="cat-color" value="#10B981"></div></div><div style="display: flex; gap: 0.5rem; margin-top: 1rem"><button class="btn-primary" style="flex: 1" onclick="saveCategory()">Salvar categoria</button><button class="btn-secondary" style="flex: 1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button></div></div>';
  document.body.appendChild(modal);
}

function editCategory(id, name, emoji, color) {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal"><div class="modal-handle"></div><h3>✏️ Editar Categoria</h3><div class="field"><label>Nome da categoria</label><input type="text" id="cat-name" value="' + escapeHtml(name) + '"></div><div class="field-row"><div class="field"><label>Emoji</label><input type="text" id="cat-emoji" value="' + emoji + '" maxlength="2"></div><div class="field"><label>Cor</label><input type="color" id="cat-color" value="' + (color || '#10B981') + '"></div></div><div style="display: flex; gap: 0.5rem; margin-top: 1rem"><button class="btn-primary" style="flex: 1" onclick="updateCategory(\'' + id + '\')">Salvar alterações</button><button class="btn-secondary" style="flex: 1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button></div></div>';
  document.body.appendChild(modal);
}

async function saveCategory() {
  var name = document.getElementById('cat-name').value.trim();
  var emoji = document.getElementById('cat-emoji').value.trim() || '📦';
  var color = document.getElementById('cat-color').value;
  if (!name) { showToast('Digite o nome da categoria'); return; }
  try {
    await api.request('/categories', { method: 'POST', body: JSON.stringify({ name: name, emoji: emoji, color: color, parent_category: 'custom' }) });
    showToast('Categoria criada com sucesso! 🏷️');
    document.querySelector('.modal-overlay').remove();
    loadCategories();
  } catch (error) {
    showToast(error.message || 'Erro ao criar categoria');
  }
}

async function updateCategory(id) {
  var name = document.getElementById('cat-name').value.trim();
  var emoji = document.getElementById('cat-emoji').value.trim() || '📦';
  var color = document.getElementById('cat-color').value;
  if (!name) { showToast('Digite o nome da categoria'); return; }
  try {
    await api.request('/categories/' + id, { method: 'PUT', body: JSON.stringify({ name: name, emoji: emoji, color: color }) });
    showToast('Categoria atualizada! ✏️');
    document.querySelector('.modal-overlay').remove();
    loadCategories();
  } catch (error) {
    showToast(error.message || 'Erro ao atualizar categoria');
  }
}

async function deleteCategory(id) {
  if (!confirm('Tem certeza que deseja remover esta categoria?\n\nContas que usam esta categoria serão movidas para "Outros".')) return;
  try {
    await api.request('/categories/' + id, { method: 'DELETE' });
    showToast('Categoria removida');
    loadCategories();
  } catch (error) {
    showToast(error.message || 'Erro ao deletar categoria');
  }
}

async function loadCategoryOptions() {
  try {
    if (allCategories.length === 0) {
      var response = await api.request('/categories');
      allCategories = response.categories || [];
    }
    var categorySelect = document.getElementById('f-cat');
    if (categorySelect) {
      var currentValue = categorySelect.value;
      var options = '';
      for (var i = 0; i < allCategories.length; i++) {
        var cat = allCategories[i];
        var selected = (cat.name === currentValue) ? 'selected' : '';
        options += '<option value="' + cat.name + '" ' + selected + '>' + (cat.emoji || '📦') + ' ' + cat.name + '</option>';
      }
      categorySelect.innerHTML = options;
    }
  } catch (error) {
    console.error('Erro ao carregar opções de categorias:', error);
  }
}

async function loadHome() {
  try {
    var dash = await api.getDashboard();
    var bills = await api.getBills();
    allBills = bills;
    var today = new Date();
    document.getElementById('bal-date').textContent = 'Saldo em ' + today.getDate() + ' de ' + today.toLocaleString('pt-BR', { month: 'long' });
    document.getElementById('bal-free').textContent = fmt(dash.freeBalance);
    document.getElementById('bal-in').textContent = fmt(dash.salary);
    document.getElementById('bal-out').textContent = fmt(dash.totalPaid || 0);
    document.getElementById('bal-pct').textContent = (dash.percentageCommitted || 0) + '%';
    document.getElementById('stat-paid').textContent = dash.paidBills || 0;
    document.getElementById('stat-pend').textContent = dash.pendingBills || 0;
    document.getElementById('stat-late').textContent = dash.lateBills || 0;
    document.getElementById('stat-total').textContent = dash.totalBills || 0;
    if (dash.salary !== undefined && currentUser) currentUser.salary = dash.salary;
    var paidBills = bills.filter(function(b) { return b.status === 'paid'; });
    var totalPaid = paidBills.reduce(function(s, b) { return s + b.value; }, 0);
    var avgDaily = totalPaid / 30;
    document.getElementById('daily-avg').textContent = fmt(avgDaily);
    document.getElementById('safe-balance').textContent = fmt(dash.freeBalance * 0.7);
    updateTobyMood(dash);
    updateCategoryChart(bills);
    renderHomeBills(bills);
  } catch (e) { console.error(e); }
}

function updateTobyMood(dash) {
  var free = dash.freeBalance || 0;
  var late = dash.lateBills || 0;
  var avatar = '🐶', msg = '', badge = '🐶';
  if (late > 0) { avatar = '😟'; msg = 'Você tem ' + late + ' conta(s) atrasada(s). Vamos resolver?'; badge = 'Preocupado'; }
  else if (free < 500 && free > 0) { avatar = '🧐'; msg = 'Saldo livre de ' + fmt(free) + '. Vamos com cuidado!'; badge = 'Atento'; }
  else if (free > 2000) { avatar = '😊'; msg = fmt(free) + ' livres! Você está indo muito bem!'; badge = 'Feliz'; }
  else { avatar = '🐶'; msg = 'Tudo dentro do esperado. Continue assim!'; badge = 'Normal'; }
  document.getElementById('toby-avatar').textContent = avatar;
  document.getElementById('toby-message').textContent = msg;
  document.getElementById('toby-badge').textContent = badge;
}

function updateCategoryChart(bills) {
  var categories = {};
  bills.filter(function(b) { return b.status === 'paid'; }).forEach(function(b) {
    var cat = b.category || 'outros';
    categories[cat] = (categories[cat] || 0) + b.value;
  });
  var total = Object.values(categories).reduce(function(s, v) { return s + v; }, 0);
  var legendDiv = document.getElementById('category-legend');
  if (total === 0) { legendDiv.innerHTML = '<div style="font-size: 12px; color: var(--text-muted)">Nenhuma despesa registrada</div>'; return; }
  var colors = { moradia: '#3B82F6', alimentacao: '#10B981', saude: '#8B5CF6', transporte: '#F59E0B', lazer: '#EC4899', educacao: '#06B6D4', tecnologia: '#6366F1', financeiro: '#EF4444', outros: '#6B7280' };
  var html = '';
  var items = Object.entries(categories).slice(0, 5);
  for (var i = 0; i < items.length; i++) {
    var cat = items[i][0];
    var val = items[i][1];
    html += '<div class="legend-item"><div class="legend-color" style="background: ' + (colors[cat] || '#6B7280') + '"></div><div class="legend-label">' + cat + '</div><div class="legend-value">' + fmt(val) + '</div><div style="font-size: 11px; color: var(--text-muted)">' + Math.round((val / total) * 100) + '%</div></div>';
  }
  legendDiv.innerHTML = html;
}

function renderHomeBills(bills) {
  var today = new Date().getDate();
  var upcoming = bills.filter(function(b) { return b.status === 'pending' || b.status === 'late'; }).sort(function(a, b) { return a.due_day - b.due_day; }).slice(0, 5);
  var el = document.getElementById('home-bills-list');
  if (!upcoming.length) { el.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: var(--text-secondary)">Sem contas pendentes 🎉</div>'; return; }
  var html = '';
  for (var i = 0; i < upcoming.length; i++) {
    var b = upcoming[i];
    var cat = CATS[b.category] || CATS.outros;
    var isLate = b.status === 'late' || (b.status === 'pending' && b.due_day < today);
    html += '<div class="transaction-item" onclick="navTo(\'bills\')"><div class="transaction-icon" style="background: ' + cat.bg + '">' + cat.e + '</div><div class="transaction-info"><div class="transaction-name">' + b.name + '</div><div class="transaction-meta">' + (isLate ? 'Atrasada' : 'Vence dia ' + b.due_day) + '</div></div><div class="transaction-right"><div class="transaction-value expense">' + fmt(b.value) + '</div><div class="transaction-status ' + (isLate ? 'status-late' : 'status-pending') + '">' + (isLate ? 'Atrasado' : 'Pendente') + '</div></div></div>';
  }
  el.innerHTML = html;
}

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
window.clearChat = clearChat;
window.editSalary = editSalary;
window.openReceiptScanner = openReceiptScanner;
window.showHollerithModal = showHollerithModal;
window.processHollerith = processHollerith;
window.showBankExtractModal = showBankExtractModal;
window.processBankExtract = processBankExtract;
window.showIncomeReport = showIncomeReport;
window.openGoalModal = openGoalModal;
window.saveGoal = saveGoal;
window.updateGoalProgress = updateGoalProgress;
window.deleteGoal = deleteGoal;
window.openCategoryModal = openCategoryModal;
window.editCategory = editCategory;
window.saveCategory = saveCategory;
window.updateCategory = updateCategory;
window.deleteCategory = deleteCategory;
window.loadCategories = loadCategories;