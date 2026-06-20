// TOBBY - APP PRINCIPAL V8.0
// COPILOTO FINANCEIRO PESSOAL

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
  // Carregar briefing matinal
  loadMorningBriefing();
}

var TABS = ['home', 'bills', 'investments', 'loans', 'wealth', 'ai', 'profile', 'journal', 'timeline', 'retirement', 'missions'];

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
    loadMorningBriefing();
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
  if (tab === 'journal') loadJournal();
  if (tab === 'timeline') loadLifeEvents();
  if (tab === 'retirement') loadRetirement();
  if (tab === 'missions') loadMissions();
}

// ===== BRIEFING MATINAL (TOBBY PROATIVO) =====
async function loadMorningBriefing() {
  try {
    var response = await api.request('/briefing/morning');
    if (response.success && response.data) {
      var briefingDiv = document.getElementById('morning-briefing');
      if (briefingDiv) {
        briefingDiv.innerHTML = response.data.briefing.replace(/\n/g, '<br>');
      }
    }
  } catch (e) {
    console.error('Erro ao carregar briefing:', e);
  }
}

// ===== DIÁRIO FINANCEIRO =====
async function loadJournal() {
  try {
    var response = await api.request('/journal');
    var container = document.getElementById('journal-list');
    if (!container) return;
    
    var entries = response.data || [];
    if (entries.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">Nenhum registro no diário. Comece a escrever!</div>';
      return;
    }
    
    container.innerHTML = entries.map(function(entry) {
      var moodEmoji = {
        happy: '😊',
        worried: '😟',
        confident: '💪',
        anxious: '😰',
        neutral: '😐'
      }[entry.mood] || '😐';
      
      return '<div class="transaction-item" style="flex-direction:column;align-items:flex-start;">' +
        '<div style="display:flex;justify-content:space-between;width:100%;">' +
        '<span style="font-weight:600;">' + escapeHtml(entry.text.substring(0, 100)) + (entry.text.length > 100 ? '...' : '') + '</span>' +
        '<span>' + moodEmoji + '</span>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">' +
        new Date(entry.entry_date).toLocaleDateString('pt-BR') +
        (entry.analysis ? ' · ' + (entry.analysis.recommendations || []).length + ' recomendações' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
        '<button class="chip" onclick="analyzeJournal(\'' + entry.id + '\')" style="font-size:10px;">🔍 Analisar</button>' +
        '<button class="chip" onclick="deleteJournal(\'' + entry.id + '\')" style="font-size:10px;background:var(--red-bg);">🗑️</button>' +
        '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar diário:', e);
  }
}

function openJournalModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>📝 Novo Registro</h3>' +
    '<div class="field"><label>Como você está se sentindo?</label>' +
    '<select id="journal-mood"><option value="happy">😊 Feliz</option><option value="worried">😟 Preocupado</option><option value="confident">💪 Confiante</option><option value="anxious">😰 Ansioso</option><option value="neutral">😐 Neutro</option></select></div>' +
    '<div class="field"><label>O que você quer registrar?</label>' +
    '<textarea id="journal-text" rows="4" placeholder="Ex: Estou preocupado com dinheiro..."></textarea></div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveJournal()">Salvar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveJournal() {
  var text = document.getElementById('journal-text').value.trim();
  var mood = document.getElementById('journal-mood').value;
  if (!text) { showToast('Digite algo'); return; }
  try {
    await api.request('/journal', {
      method: 'POST',
      body: JSON.stringify({ text, mood })
    });
    showToast('Registro salvo! 📝');
    document.querySelector('.modal-overlay').remove();
    loadJournal();
  } catch (e) {
    showToast('Erro ao salvar');
  }
}

async function analyzeJournal(id) {
  try {
    showToast('🔍 Analisando com IA...');
    var response = await api.request('/journal/' + id + '/analyze', { method: 'POST' });
    if (response.success) {
      var analysis = response.data.analysis;
      var msg = '📊 ANÁLISE DO REGISTRO\n\n';
      msg += 'Emoções: ' + (analysis.emotions || []).join(', ') + '\n';
      msg += 'Gatilhos: ' + (analysis.triggers || []).join(', ') + '\n\n';
      msg += '💡 Recomendações:\n' + (analysis.recommendations || []).map(function(r) { return '• ' + r; }).join('\n');
      alert(msg);
    }
  } catch (e) {
    showToast('Erro ao analisar');
  }
}

async function deleteJournal(id) {
  if (!confirm('Remover este registro?')) return;
  try {
    await api.request('/journal/' + id, { method: 'DELETE' });
    showToast('Registro removido');
    loadJournal();
  } catch (e) {
    showToast('Erro ao remover');
  }
}

// ===== LINHA DO TEMPO DA VIDA =====
async function loadLifeEvents() {
  try {
    var response = await api.request('/life-events');
    var container = document.getElementById('timeline-list');
    if (!container) return;
    
    var events = response.data || [];
    if (events.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">Nenhum evento registrado. Marque sua história!</div>';
      return;
    }
    
    var grouped = response.grouped || {};
    var html = '';
    Object.keys(grouped).sort().reverse().forEach(function(year) {
      html += '<div style="margin-top:1rem;"><strong style="font-size:18px;">📅 ' + year + '</strong></div>';
      grouped[year].forEach(function(event) {
        var categoryEmoji = { career: '💼', family: '👨‍👩‍👧‍👦', education: '🎓', health: '🏥', finance: '💰', other: '📌' }[event.category] || '📌';
        html += '<div class="transaction-item" style="flex-direction:column;align-items:flex-start;">' +
          '<div style="display:flex;justify-content:space-between;width:100%;">' +
          '<span style="font-weight:600;">' + categoryEmoji + ' ' + escapeHtml(event.title) + '</span>' +
          '<span style="font-size:12px;color:var(--text-muted);">' + new Date(event.event_date).toLocaleDateString('pt-BR') + '</span>' +
          '</div>' +
          (event.description ? '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">' + escapeHtml(event.description) + '</div>' : '') +
          '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button class="chip" onclick="deleteLifeEvent(\'' + event.id + '\')" style="font-size:10px;background:var(--red-bg);">🗑️</button>' +
          '</div></div>';
      });
    });
    container.innerHTML = html;
  } catch (e) {
    console.error('Erro ao carregar timeline:', e);
  }
}

function openLifeEventModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>📅 Novo Evento da Vida</h3>' +
    '<div class="field"><label>Título</label><input type="text" id="event-title" placeholder="Ex: Comprei minha casa"></div>' +
    '<div class="field"><label>Descrição</label><textarea id="event-description" rows="2" placeholder="Detalhes do evento..."></textarea></div>' +
    '<div class="field-row">' +
    '<div class="field"><label>Data</label><input type="date" id="event-date"></div>' +
    '<div class="field"><label>Categoria</label><select id="event-category"><option value="career">💼 Carreira</option><option value="family">👨‍👩‍👧‍👦 Família</option><option value="education">🎓 Educação</option><option value="health">🏥 Saúde</option><option value="finance">💰 Finanças</option><option value="other">📌 Outro</option></select></div>' +
    '</div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveLifeEvent()">Salvar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveLifeEvent() {
  var title = document.getElementById('event-title').value.trim();
  var description = document.getElementById('event-description').value.trim();
  var event_date = document.getElementById('event-date').value;
  var category = document.getElementById('event-category').value;
  if (!title || !event_date) { showToast('Título e data são obrigatórios'); return; }
  try {
    await api.request('/life-events', {
      method: 'POST',
      body: JSON.stringify({ title, description, event_date, category })
    });
    showToast('Evento salvo! 📅');
    document.querySelector('.modal-overlay').remove();
    loadLifeEvents();
  } catch (e) {
    showToast('Erro ao salvar');
  }
}

async function deleteLifeEvent(id) {
  if (!confirm('Remover este evento?')) return;
  try {
    await api.request('/life-events/' + id, { method: 'DELETE' });
    showToast('Evento removido');
    loadLifeEvents();
  } catch (e) {
    showToast('Erro ao remover');
  }
}

// ===== PLANEJADOR DE APOSENTADORIA =====
async function loadRetirement() {
  try {
    var response = await api.request('/retirement');
    var container = document.getElementById('retirement-container');
    if (!container) return;
    
    var plan = response.data;
    if (!plan) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">' +
        '🏖️ Planeje sua aposentadoria<br>' +
        '<button class="btn-primary" style="margin-top:1rem;max-width:200px;" onclick="openRetirementModal()">Começar planejamento</button>' +
        '</div>';
      return;
    }
    
    var sim = plan.simulation_result || {};
    container.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">' +
      '<div class="stat-card"><div class="stat-label">Idade Atual</div><div class="stat-value" style="font-size:18px;">' + plan.current_age + ' anos</div></div>' +
      '<div class="stat-card"><div class="stat-label">Aposentadoria</div><div class="stat-value" style="font-size:18px;">' + plan.retirement_age + ' anos</div></div>' +
      '<div class="stat-card"><div class="stat-label">Patrimônio Futuro</div><div class="stat-value" style="font-size:16px;color:var(--green);">' + fmt(sim.futureValue || 0) + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Renda Mensal</div><div class="stat-value" style="font-size:16px;color:var(--blue);">' + fmt(sim.monthlyIncome || 0) + '</div></div>' +
      '</div>' +
      '<div style="margin-top:1rem;display:flex;gap:0.5rem;">' +
      '<button class="btn-secondary" style="flex:1;" onclick="openRetirementModal()">✏️ Editar</button>' +
      '</div>';
  } catch (e) {
    console.error('Erro ao carregar aposentadoria:', e);
  }
}

function openRetirementModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>🏖️ Planejador de Aposentadoria</h3>' +
    '<div class="field-row">' +
    '<div class="field"><label>Idade Atual</label><input type="number" id="ret-current-age" placeholder="30"></div>' +
    '<div class="field"><label>Idade Desejada</label><input type="number" id="ret-retirement-age" placeholder="65"></div>' +
    '</div>' +
    '<div class="field-row">' +
    '<div class="field"><label>Patrimônio Atual (R$)</label><input type="number" id="ret-current-savings" step="0.01" placeholder="0"></div>' +
    '<div class="field"><label>Aporte Mensal (R$)</label><input type="number" id="ret-monthly-contribution" step="0.01" placeholder="500"></div>' +
    '</div>' +
    '<div class="field"><label>Rentabilidade Estimada (%)</label><input type="number" id="ret-expected-return" step="0.1" placeholder="8.0"></div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveRetirement()">Salvar e Simular</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveRetirement() {
  var current_age = parseInt(document.getElementById('ret-current-age').value);
  var retirement_age = parseInt(document.getElementById('ret-retirement-age').value);
  var current_savings = parseFloat(document.getElementById('ret-current-savings').value) || 0;
  var monthly_contribution = parseFloat(document.getElementById('ret-monthly-contribution').value) || 0;
  var expected_return = parseFloat(document.getElementById('ret-expected-return').value) || 8.0;
  
  if (!current_age || !retirement_age) { showToast('Idades são obrigatórias'); return; }
  
  try {
    await api.request('/retirement', {
      method: 'POST',
      body: JSON.stringify({ current_age, retirement_age, current_savings, monthly_contribution, expected_return })
    });
    showToast('Plano salvo! 🏖️');
    document.querySelector('.modal-overlay').remove();
    loadRetirement();
  } catch (e) {
    showToast('Erro ao salvar');
  }
}

// ===== MISSÕES =====
async function loadMissions() {
  try {
    var response = await api.request('/missions');
    var container = document.getElementById('missions-list');
    if (!container) return;
    
    var missions = response.data || [];
    if (missions.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary)">' +
        '🎯 Nenhuma missão para esta semana<br>' +
        '<button class="btn-primary" style="margin-top:1rem;max-width:200px;" onclick="generateMissions()">Gerar missões com IA</button>' +
        '</div>';
      return;
    }
    
    container.innerHTML = missions.map(function(mission) {
      var statusEmoji = { pending: '⏳', in_progress: '🔄', completed: '✅', failed: '❌' }[mission.status] || '⏳';
      var progress = mission.progress || 0;
      return '<div class="stat-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-weight:600;">' + statusEmoji + ' ' + escapeHtml(mission.title) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);">' + progress + '%</div>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);margin:4px 0;">' + escapeHtml(mission.description) + '</div>' +
        '<div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;">' +
        '<div style="width:' + progress + '%;height:100%;background:var(--green);border-radius:2px;"></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
        (mission.status !== 'completed' ? '<button class="chip" onclick="updateMissionProgress(\'' + mission.id + '\')" style="font-size:10px;">📈 Progresso</button>' : '') +
        (mission.status !== 'completed' ? '<button class="chip" onclick="completeMission(\'' + mission.id + '\')" style="font-size:10px;background:var(--green);">✅ Concluir</button>' : '') +
        '</div></div>';
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar missões:', e);
  }
}

async function generateMissions() {
  try {
    showToast('🧠 Gerando missões com IA...');
    var response = await api.request('/missions/generate', { method: 'POST' });
    showToast(response.message || 'Missões geradas! 🎯');
    loadMissions();
  } catch (e) {
    showToast('Erro ao gerar missões');
  }
}

async function updateMissionProgress(id) {
  var newProgress = prompt('Digite o progresso atual (0-100):', '50');
  if (newProgress === null) return;
  var progress = parseFloat(newProgress);
  if (isNaN(progress) || progress < 0 || progress > 100) { showToast('Valor inválido'); return; }
  try {
    await api.request('/missions/' + id + '/progress', {
      method: 'PATCH',
      body: JSON.stringify({ progress: progress })
    });
    showToast('Progresso atualizado! 📈');
    loadMissions();
  } catch (e) {
    showToast('Erro ao atualizar');
  }
}

async function completeMission(id) {
  if (!confirm('Concluir esta missão?')) return;
  try {
    await api.request('/missions/' + id + '/complete', { method: 'POST' });
    showToast('Missão concluída! 🏆');
    loadMissions();
  } catch (e) {
    showToast('Erro ao concluir');
  }
}

// ============================================
// FUNÇÕES EXISTENTES (BILLS, INVESTMENTS, ETC)
// ============================================

// [Aqui vão todas as funções existentes do app.js anterior]
// (loadHome, loadBills, loadInvestments, loadLoans, loadWealth, loadInsights, etc.)

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
window.loadJournal = loadJournal;
window.openJournalModal = openJournalModal;
window.saveJournal = saveJournal;
window.analyzeJournal = analyzeJournal;
window.deleteJournal = deleteJournal;
window.loadLifeEvents = loadLifeEvents;
window.openLifeEventModal = openLifeEventModal;
window.saveLifeEvent = saveLifeEvent;
window.deleteLifeEvent = deleteLifeEvent;
window.loadRetirement = loadRetirement;
window.openRetirementModal = openRetirementModal;
window.saveRetirement = saveRetirement;
window.loadMissions = loadMissions;
window.generateMissions = generateMissions;
window.updateMissionProgress = updateMissionProgress;
window.completeMission = completeMission;

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
  initTheme();
  var token = localStorage.getItem('token');
  if (token) {
    try {
      var profile = await api.getProfile();
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