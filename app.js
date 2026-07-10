// app.js - TOBBY APP PRINCIPAL V9.0
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
var CATEGORY_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4', '#22D07A'];

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
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

function checkResetToken() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('reset');
  if (token) {
    resetToken = token;
    showScreen('auth');
    document.getElementById('reset-card').style.display = 'block';
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('forgot-card').style.display = 'none';
  }
}

// ============================================
// TEMA
// ============================================

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

// ============================================
// SERVICE WORKER
// ============================================

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('❌ Service Worker não suportado neste navegador');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/Tobby/sw.js');
    console.log('✅ Service Worker registrado com sucesso!', registration);
    
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('🔄 Novo Service Worker encontrado:', newWorker);
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          console.log('✅ Novo Service Worker ativado!');
        }
      });
    });
    
    const stored = localStorage.getItem('tobby_notifications');
    if (stored) {
      try {
        const notifications = JSON.parse(stored);
        for (const notif of notifications) {
          await registration.showNotification(notif.title, { 
            body: notif.body, 
            icon: '/Tobby/icon-192.png',
            badge: '/Tobby/icon-192.png'
          });
        }
        localStorage.removeItem('tobby_notifications');
      } catch (e) {
        console.warn('Erro ao mostrar notificações pendentes:', e);
      }
    }
    
    return registration;
  } catch (error) {
    console.error('❌ Erro ao registrar Service Worker:', error);
    console.warn('💡 Verifique se o arquivo /Tobby/sw.js existe e está acessível');
  }
}

// ============================================
// TELAS E NAVEGAÇÃO
// ============================================

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { 
    s.classList.remove('active'); 
  });
  var screen = document.getElementById(id);
  if (screen) screen.classList.add('active');
}

function showLogin() {
  var loginCard = document.getElementById('login-card');
  var registerCard = document.getElementById('register-card');
  var forgotCard = document.getElementById('forgot-card');
  var resetCard = document.getElementById('reset-card');
  
  if (loginCard) loginCard.style.display = 'block';
  if (registerCard) registerCard.style.display = 'none';
  if (forgotCard) forgotCard.style.display = 'none';
  if (resetCard) resetCard.style.display = 'none';
}

function showRegister() {
  var loginCard = document.getElementById('login-card');
  var registerCard = document.getElementById('register-card');
  var forgotCard = document.getElementById('forgot-card');
  var resetCard = document.getElementById('reset-card');
  
  if (loginCard) loginCard.style.display = 'none';
  if (registerCard) registerCard.style.display = 'block';
  if (forgotCard) forgotCard.style.display = 'none';
  if (resetCard) resetCard.style.display = 'none';
}

function showForgotPassword() {
  var loginCard = document.getElementById('login-card');
  var registerCard = document.getElementById('register-card');
  var forgotCard = document.getElementById('forgot-card');
  var resetCard = document.getElementById('reset-card');
  
  if (loginCard) loginCard.style.display = 'none';
  if (registerCard) registerCard.style.display = 'none';
  if (forgotCard) forgotCard.style.display = 'block';
  if (resetCard) resetCard.style.display = 'none';
}

// ============================================
// AUTENTICAÇÃO
// ============================================

async function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pwd = document.getElementById('login-pwd').value;
  if (!email || !pwd) { showToast('Preencha e-mail e senha'); return; }
  try {
    var user = await api.login(email, pwd);
    currentUser = user;
    var errDiv = document.getElementById('login-err');
    if (errDiv) errDiv.style.display = 'none';
    enterApp();
  } catch (e) {
    var errDiv = document.getElementById('login-err');
    if (errDiv) {
      errDiv.style.display = 'block';
      errDiv.textContent = e.message || 'E-mail ou senha inválidos';
    }
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
    if (errDiv) {
      errDiv.style.display = 'block';
      errDiv.textContent = e.message || 'Erro ao criar conta';
    }
  }
}

async function doForgotPassword() {
  var email = document.getElementById('forgot-email').value.trim();
  if (!email) { showToast('Digite seu e-mail'); return; }
  try {
    var data = await api.forgotPassword(email);
    var successDiv = document.getElementById('forgot-success');
    if (successDiv) {
      successDiv.style.display = 'block';
      successDiv.innerHTML = '📧 ' + data.message;
    }
    setTimeout(function() { showLogin(); }, 3000);
  } catch (e) {
    var errDiv = document.getElementById('forgot-err');
    if (errDiv) {
      errDiv.style.display = 'block';
      errDiv.textContent = e.message;
    }
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
  var avatar = document.getElementById('top-avatar');
  var profAv = document.getElementById('prof-av');
  var profName = document.getElementById('prof-name');
  var profEmail = document.getElementById('prof-email');
  var profSalary = document.getElementById('prof-salary');
  
  if (avatar) avatar.textContent = initials;
  if (profAv) profAv.textContent = initials;
  if (profName) profName.textContent = currentUser.name;
  if (profEmail) profEmail.textContent = currentUser.email;
  if (profSalary) profSalary.textContent = fmt(currentUser.salary);
}

// ============================================
// TOBY CARD - CORRIGIDO (SEM "Analisando suas finanças...")
// ============================================

function updateTobyCard() {
  var avatar = document.getElementById('toby-avatar');
  var message = document.getElementById('toby-message');
  var badge = document.getElementById('toby-badge');
  
  if (!avatar || !message || !badge) return;
  
  // Saudação baseada no horário
  var hour = new Date().getHours();
  var greeting = '';
  var emoji = '';
  
  if (hour >= 6 && hour < 12) {
    greeting = 'Bom dia';
    emoji = '🌅';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Boa tarde';
    emoji = '☀️';
  } else if (hour >= 18 && hour < 24) {
    greeting = 'Boa noite';
    emoji = '🌙';
  } else {
    greeting = 'Boa madrugada';
    emoji = '🌃';
  }
  
  // Mensagens amigáveis e motivacionais
  var messages = [
    `${greeting}! Como posso ajudar você hoje? ${emoji}`,
    `${greeting}! Estou aqui para te ajudar com suas finanças! 🐶`,
    `${greeting}! Vamos organizar suas finanças juntos! 📊`,
    `${greeting}! Como estão seus gastos hoje? 💰`,
    `${greeting}! Que tal revisarmos suas metas? 🎯`,
    `${greeting}! Estou pronto para te ajudar! 🐾`,
    `${greeting}! Vamos cuidar do seu dinheiro juntos! 💪`
  ];
  
  // Escolher mensagem aleatória
  var randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  // Atualizar o card
  avatar.textContent = '🐶';
  message.textContent = randomMessage;
  badge.textContent = '🐶';
  
  console.log('[TOBY] Card atualizado com mensagem:', randomMessage);
}

// ============================================
// ENTRADA NO APP
// ============================================

async function enterApp() {
  showScreen('app');
  updateUserUI();
  navTo('home');
  loadMorningBriefing();
  setTimeout(registerServiceWorker, 2000);
  
  // Atualizar o card do Tobby
  updateTobyCard();
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
    updateTobyCard(); // Atualizar o card ao voltar para home
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

// ============================================
// HOME - CORRIGIDO
// ============================================

async function loadHome() {
  try {
    var summary = await api.request('/bills/dashboard-summary');
    var salario = currentUser?.salary || 0;
    var total = summary.total || 0;
    var pending = summary.pending || 0;
    var paid = summary.paid || 0;
    
    var free = salario - paid;
    
    document.getElementById('bal-free').textContent = fmt(Math.max(0, free));
    document.getElementById('bal-in').textContent = fmt(salario);
    document.getElementById('bal-out').textContent = fmt(paid);
    var pct = salario > 0 ? Math.min(100, Math.round((total / salario) * 100)) : 0;
    document.getElementById('bal-pct').textContent = pct + '%';
    
    document.getElementById('stat-paid').textContent = summary.paid_count || 0;
    document.getElementById('stat-pend').textContent = summary.pending_count || 0;
    document.getElementById('stat-late').textContent = summary.late_count || 0;
    document.getElementById('stat-total').textContent = summary.count || 0;
    
    document.getElementById('bal-date').textContent = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    loadHomeBills();
    
    // Atualizar o card do Tobby após carregar os dados
    updateTobyCard();
  } catch (e) {
    console.error('Erro ao carregar home:', e);
  }
}

async function loadHomeBills() {
  try {
    var bills = await api.request('/bills');
    var data = bills.data || [];
    var container = document.getElementById('home-bills-list');
    if (!container) return;
    
    var now = new Date().getDate();
    var upcoming = data.filter(function(b) { 
      return b.status === 'pending' && b.due_day >= now; 
    }).sort(function(a, b) { return a.due_day - b.due_day; }).slice(0, 5);
    
    if (upcoming.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:13px;">Nenhuma conta próxima</div>';
      return;
    }
    
    container.innerHTML = upcoming.map(function(bill) {
      var cat = CATS[bill.category] || CATS.outros;
      return '<div class="transaction-item">' +
        '<div class="transaction-icon" style="background:' + cat.bg + ';">' + cat.e + '</div>' +
        '<div class="transaction-info">' +
        '<div class="transaction-name">' + escapeHtml(bill.name) + '</div>' +
        '<div class="transaction-meta">Vence dia ' + bill.due_day + '</div>' +
        '</div>' +
        '<div class="transaction-value" style="color:var(--orange);">' + fmt(bill.value) + '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar próximas contas:', e);
  }
}

// ============================================
// SCORE
// ============================================

async function loadFinancialScore() {
  try {
    var response = await api.request('/score');
    var score = response.score || 0;
    document.getElementById('score-value').textContent = score;
    var bar = document.getElementById('score-bar');
    if (bar) {
      bar.style.width = Math.min(score, 100) + '%';
      bar.style.background = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--yellow)' : 'var(--red)';
    }
    var label = document.getElementById('score-label');
    if (label) {
      if (score >= 90) label.textContent = 'Excelente! 🏆';
      else if (score >= 70) label.textContent = 'Bom! ✅';
      else if (score >= 50) label.textContent = 'Regular ⚠️';
      else label.textContent = 'Atenção 🔴';
    }
    var emoji = document.getElementById('score-emoji');
    if (emoji) {
      if (score >= 70) emoji.textContent = '🏆';
      else if (score >= 40) emoji.textContent = '📈';
      else emoji.textContent = '⚠️';
    }
  } catch (e) {
    console.error('Erro ao carregar score:', e);
  }
}

// ============================================
// RESERVA DE EMERGÊNCIA
// ============================================

async function loadEmergencyFund() {
  try {
    var response = await api.request('/emergency-fund');
    var fund = response || {};
    var current = fund.current_amount || 0;
    var targetMonths = fund.target_months || 6;
    
    document.getElementById('emergency-amount').textContent = fmt(current);
    document.getElementById('emergency-months').textContent = '🛡️ ' + targetMonths + ' meses';
    
    var salary = currentUser?.salary || 0;
    var recommended = salary * targetMonths;
    document.getElementById('emergency-recommended').textContent = 'Recomendado: ' + fmt(recommended);
    
    var progress = recommended > 0 ? Math.min(100, (current / recommended) * 100) : 0;
    document.getElementById('emergency-progress').style.width = progress + '%';
  } catch (e) {
    console.error('Erro ao carregar reserva:', e);
  }
}

// ============================================
// METAS - CORRIGIDO
// ============================================

async function loadGoals() {
  try {
    var response = await api.request('/financial-goals');
    var goals = response.goals || [];
    var container = document.getElementById('goals-list');
    if (!container) return;
    
    if (goals.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);font-size:13px;">Nenhuma meta ativa</div>';
      return;
    }
    
    container.innerHTML = goals.slice(0, 3).map(function(g) {
      var progress = g.target_amount > 0 ? (g.current_amount / g.target_amount * 100) : 0;
      return '<div class="stat-card" style="padding:0.75rem;">' +
        '<div style="display:flex;justify-content:space-between;">' +
        '<span style="font-size:13px;">' + escapeHtml(g.name) + '</span>' +
        '<span style="font-size:12px;color:var(--text-muted);">' + fmt(g.current_amount) + ' / ' + fmt(g.target_amount) + '</span>' +
        '</div>' +
        '<div style="height:4px;background:var(--border);border-radius:2px;margin-top:4px;">' +
        '<div style="width:' + Math.min(progress, 100) + '%;height:100%;background:var(--blue);border-radius:2px;"></div>' +
        '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar metas:', e);
  }
}

// ============================================
// BRIEFING MATINAL
// ============================================

async function loadMorningBriefing() {
  try {
    var response = await api.request('/briefing/morning');
    var briefingText = document.getElementById('briefing-text');
    if (briefingText && response.success && response.data) {
      briefingText.innerHTML = response.data.briefing.replace(/\n/g, '<br>');
    }
  } catch (e) {
    console.error('Erro ao carregar briefing:', e);
  }
}

// ============================================
// CONTAS (BILLS)
// ============================================

async function loadBills() {
  try {
    var bills = await api.request('/bills');
    allBills = bills.data || [];
    renderBills();
  } catch (e) {
    console.error('Erro ao carregar contas:', e);
  }
}

function renderBills() {
  var list = document.getElementById('bills-list-main');
  if (!list) return;
  
  var filtered = allBills;
  if (currentFilter !== 'all') {
    filtered = allBills.filter(function(b) { return b.status === currentFilter; });
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Nenhuma conta encontrada</div>';
    return;
  }
  
  filtered.sort(function(a, b) { return (a.due_day || 0) - (b.due_day || 0); });
  
  list.innerHTML = filtered.map(function(bill) {
    var cat = CATS[bill.category] || CATS.outros;
    var statusClass = bill.status === 'paid' ? 'paid' : bill.status === 'late' ? 'late' : '';
    var statusText = bill.status === 'paid' ? '✅ Pago' : bill.status === 'late' ? '⚠️ Atrasado' : '⏳ Pendente';
    
    return '<div class="transaction-item ' + statusClass + '">' +
      '<div class="transaction-icon" style="background:' + cat.bg + ';">' + cat.e + '</div>' +
      '<div class="transaction-info">' +
      '<div class="transaction-name">' + escapeHtml(bill.name) + '</div>' +
      '<div class="transaction-meta">Vence dia ' + bill.due_day + ' · ' + statusText + '</div>' +
      '</div>' +
      '<div class="transaction-amount">' +
      '<div class="transaction-value">' + fmt(bill.value) + '</div>' +
      '<div class="transaction-actions">' +
      '<button class="chip" onclick="toggleStatus(\'' + bill.id + '\')" style="font-size:9px;">' + (bill.status === 'paid' ? '↩️ Reabrir' : '✅ Pagar') + '</button>' +
      '<button class="chip" onclick="deleteBill(\'' + bill.id + '\')" style="font-size:9px;background:var(--red-bg);">🗑️</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }).join('');
}

function filterBills(element, filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(function(c) {
    c.classList.toggle('active', c === element);
  });
  renderBills();
}

function openBillModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>➕ Nova Conta</h3>' +
    '<div class="field"><label>Nome</label><input type="text" id="bill-name" placeholder="Ex: Aluguel"></div>' +
    '<div class="field"><label>Valor (R$)</label><input type="number" id="bill-value" step="0.01" placeholder="0,00"></div>' +
    '<div class="field-row">' +
    '<div class="field"><label>Dia de Vencimento</label><input type="number" id="bill-due" min="1" max="31" placeholder="5"></div>' +
    '<div class="field"><label>Categoria</label><select id="bill-category">' +
    Object.keys(CATS).map(function(c) { return '<option value="' + c + '">' + CATS[c].e + ' ' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>'; }).join('') +
    '</select></div>' +
    '</div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveBill()">Salvar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveBill() {
  var name = document.getElementById('bill-name').value.trim();
  var value = parseFloat(document.getElementById('bill-value').value);
  var due_day = parseInt(document.getElementById('bill-due').value);
  var category = document.getElementById('bill-category').value;
  
  if (!name || !value || !due_day) { showToast('Preencha todos os campos'); return; }
  if (due_day < 1 || due_day > 31) { showToast('Dia inválido (1-31)'); return; }
  
  try {
    await api.request('/bills', {
      method: 'POST',
      body: JSON.stringify({ name, value, due_day, category })
    });
    showToast('Conta criada! ✅');
    document.querySelector('.modal-overlay').remove();
    loadBills();
    loadHome();
  } catch (e) {
    showToast('Erro ao criar conta');
  }
}

async function deleteBill(id) {
  if (!confirm('Remover esta conta?')) return;
  try {
    await api.request('/bills/' + id, { method: 'DELETE' });
    showToast('Conta removida');
    loadBills();
    loadHome();
  } catch (e) {
    showToast('Erro ao remover');
  }
}

async function toggleStatus(id) {
  var bill = allBills.find(function(b) { return b.id === id; });
  if (!bill) return;
  var newStatus = bill.status === 'paid' ? 'pending' : 'paid';
  try {
    await api.request('/bills/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    loadBills();
    loadHome();
  } catch (e) {
    showToast('Erro ao atualizar');
  }
}

// ============================================
// INVESTIMENTOS
// ============================================

async function loadInvestments() {
  try {
    var investments = await api.request('/investments');
    var container = document.getElementById('investments-list-container');
    if (!container) return;
    
    var data = investments.investments || [];
    
    var totalInvested = data.reduce(function(sum, inv) { return sum + (inv.quantity * inv.purchase_price); }, 0);
    var totalCurrent = data.reduce(function(sum, inv) { return sum + (inv.quantity * (inv.current_price || inv.purchase_price)); }, 0);
    
    document.getElementById('total-invested').textContent = fmt(totalInvested);
    document.getElementById('current-value').textContent = fmt(totalCurrent);
    
    if (data.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Nenhum investimento cadastrado</div>';
      return;
    }
    
    container.innerHTML = data.map(function(inv) {
      var total = (inv.quantity || 0) * (inv.purchase_price || 0);
      return '<div class="transaction-item">' +
        '<div class="transaction-icon" style="background:var(--blue-bg);">📈</div>' +
        '<div class="transaction-info">' +
        '<div class="transaction-name">' + escapeHtml(inv.symbol) + '</div>' +
        '<div class="transaction-meta">' + inv.quantity + ' un · ' + (inv.asset_type || 'ações') + '</div>' +
        '</div>' +
        '<div class="transaction-amount">' +
        '<div class="transaction-value">' + fmt(total) + '</div>' +
        '<button class="chip" onclick="deleteInvestment(\'' + inv.id + '\')" style="font-size:9px;background:var(--red-bg);">🗑️</button>' +
        '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar investimentos:', e);
  }
}

function showAddInvestmentModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>📈 Novo Investimento</h3>' +
    '<div class="field"><label>Ativo (ex: PETR4)</label><input type="text" id="inv-symbol" placeholder="PETR4"></div>' +
    '<div class="field-row">' +
    '<div class="field"><label>Quantidade</label><input type="number" id="inv-quantity" step="0.0001" placeholder="10"></div>' +
    '<div class="field"><label>Preço (R$)</label><input type="number" id="inv-price" step="0.01" placeholder="25.50"></div>' +
    '</div>' +
    '<div class="field"><label>Tipo</label><select id="inv-type"><option value="stock">Ações</option><option value="fii">FIIs</option><option value="crypto">Cripto</option><option value="fixed_income">Renda Fixa</option></select></div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveInvestment()">Salvar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveInvestment() {
  var symbol = document.getElementById('inv-symbol').value.trim().toUpperCase();
  var quantity = parseFloat(document.getElementById('inv-quantity').value);
  var purchase_price = parseFloat(document.getElementById('inv-price').value);
  var asset_type = document.getElementById('inv-type').value;
  
  if (!symbol || !quantity || !purchase_price) { showToast('Preencha todos os campos'); return; }
  
  try {
    await api.request('/investments', {
      method: 'POST',
      body: JSON.stringify({ symbol, quantity, purchase_price, asset_type, purchase_date: new Date().toISOString().split('T')[0] })
    });
    showToast('Investimento adicionado! 📈');
    document.querySelector('.modal-overlay').remove();
    loadInvestments();
  } catch (e) {
    showToast('Erro ao adicionar');
  }
}

async function deleteInvestment(id) {
  if (!confirm('Remover este investimento?')) return;
  try {
    await api.request('/investments/' + id, { method: 'DELETE' });
    showToast('Investimento removido');
    loadInvestments();
  } catch (e) {
    showToast('Erro ao remover');
  }
}

// ============================================
// FINANCIAMENTOS
// ============================================

async function loadLoans() {
  try {
    var loans = await api.request('/loans');
    var container = document.getElementById('loans-list-container');
    if (!container) return;
    
    var data = loans.loans || [];
    
    var totalDebt = data.reduce(function(sum, l) { return sum + (l.outstanding_balance || 0); }, 0);
    var totalMonthly = data.reduce(function(sum, l) { return sum + (l.monthly_payment || 0); }, 0);
    
    document.getElementById('total-debt').textContent = fmt(totalDebt);
    document.getElementById('total-monthly').textContent = fmt(totalMonthly);
    
    if (data.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Nenhum financiamento cadastrado</div>';
      return;
    }
    
    container.innerHTML = data.map(function(loan) {
      return '<div class="transaction-item">' +
        '<div class="transaction-icon" style="background:var(--red-bg);">🏦</div>' +
        '<div class="transaction-info">' +
        '<div class="transaction-name">' + escapeHtml(loan.name) + '</div>' +
        '<div class="transaction-meta">' + (loan.remaining_installments || 0) + ' parcelas restantes</div>' +
        '</div>' +
        '<div class="transaction-amount">' +
        '<div class="transaction-value">' + fmt(loan.outstanding_balance || 0) + '</div>' +
        '<button class="chip" onclick="deleteLoan(\'' + loan.id + '\')" style="font-size:9px;background:var(--red-bg);">🗑️</button>' +
        '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar financiamentos:', e);
  }
}

function showAddLoanModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>🏦 Novo Financiamento</h3>' +
    '<div class="field"><label>Nome</label><input type="text" id="loan-name" placeholder="Ex: Financiamento Casa"></div>' +
    '<div class="field"><label>Valor Total (R$)</label><input type="number" id="loan-total" step="0.01" placeholder="100000"></div>' +
    '<div class="field-row">' +
    '<div class="field"><label>Taxa de Juros (%)</label><input type="number" id="loan-rate" step="0.01" placeholder="8.5"></div>' +
    '<div class="field"><label>Parcelas</label><input type="number" id="loan-installments" placeholder="120"></div>' +
    '</div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveLoan()">Salvar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveLoan() {
  var name = document.getElementById('loan-name').value.trim();
  var total_principal = parseFloat(document.getElementById('loan-total').value);
  var interest_rate = parseFloat(document.getElementById('loan-rate').value);
  var remaining_installments = parseInt(document.getElementById('loan-installments').value);
  
  if (!name || !total_principal || !interest_rate || !remaining_installments) {
    showToast('Preencha todos os campos');
    return;
  }
  
  try {
    await api.request('/loans', {
      method: 'POST',
      body: JSON.stringify({
        name,
        total_principal,
        outstanding_balance: total_principal,
        interest_rate,
        remaining_installments,
        start_date: new Date().toISOString().split('T')[0]
      })
    });
    showToast('Financiamento adicionado! 🏦');
    document.querySelector('.modal-overlay').remove();
    loadLoans();
  } catch (e) {
    showToast('Erro ao adicionar');
  }
}

async function deleteLoan(id) {
  if (!confirm('Remover este financiamento?')) return;
  try {
    await api.request('/loans/' + id, { method: 'DELETE' });
    showToast('Financiamento removido');
    loadLoans();
  } catch (e) {
    showToast('Erro ao remover');
  }
}

// ============================================
// PATRIMÔNIO
// ============================================

async function loadWealth() {
  try {
    var summary = await api.request('/wealth/summary');
    var assets = await api.request('/wealth/assets');
    
    var netWorth = summary.summary?.netWorth || 0;
    var totalAssets = summary.summary?.totalAssets || 0;
    var totalLiabilities = summary.summary?.totalLiabilities || 0;
    
    document.getElementById('net-worth').textContent = fmt(netWorth);
    document.getElementById('total-assets').textContent = fmt(totalAssets);
    document.getElementById('total-liabilities').textContent = fmt(totalLiabilities);
    
    var container = document.getElementById('assets-list-container');
    if (!container) return;
    
    var data = assets.assets || [];
    if (data.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);">Nenhum bem cadastrado</div>';
      return;
    }
    
    container.innerHTML = data.map(function(asset) {
      return '<div class="transaction-item">' +
        '<div class="transaction-icon" style="background:var(--green-bg);">🏠</div>' +
        '<div class="transaction-info">' +
        '<div class="transaction-name">' + escapeHtml(asset.name) + '</div>' +
        '<div class="transaction-meta">' + (asset.asset_type || 'outro') + '</div>' +
        '</div>' +
        '<div class="transaction-amount">' +
        '<div class="transaction-value">' + fmt(asset.estimated_value || 0) + '</div>' +
        '<button class="chip" onclick="deleteAsset(\'' + asset.id + '\')" style="font-size:9px;background:var(--red-bg);">🗑️</button>' +
        '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar patrimônio:', e);
  }
}

function showAddAssetModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>🏠 Novo Bem</h3>' +
    '<div class="field"><label>Nome</label><input type="text" id="asset-name" placeholder="Ex: Apartamento"></div>' +
    '<div class="field"><label>Valor Estimado (R$)</label><input type="number" id="asset-value" step="0.01" placeholder="300000"></div>' +
    '<div class="field"><label>Tipo</label><select id="asset-type"><option value="real_estate">Imóvel</option><option value="vehicle">Veículo</option><option value="savings">Poupança</option><option value="other">Outro</option></select></div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveAsset()">Salvar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveAsset() {
  var name = document.getElementById('asset-name').value.trim();
  var estimated_value = parseFloat(document.getElementById('asset-value').value);
  var asset_type = document.getElementById('asset-type').value;
  
  if (!name || !estimated_value) { showToast('Preencha todos os campos'); return; }
  
  try {
    await api.request('/wealth/assets', {
      method: 'POST',
      body: JSON.stringify({ name, estimated_value, asset_type })
    });
    showToast('Bem adicionado! 🏠');
    document.querySelector('.modal-overlay').remove();
    loadWealth();
  } catch (e) {
    showToast('Erro ao adicionar');
  }
}

async function deleteAsset(id) {
  if (!confirm('Remover este bem?')) return;
  try {
    await api.request('/wealth/assets/' + id, { method: 'DELETE' });
    showToast('Bem removido');
    loadWealth();
  } catch (e) {
    showToast('Erro ao remover');
  }
}

// ============================================
// IA - ASSISTENTE
// ============================================

var chatHistory = [];

async function loadInsights() {
  try {
    var response = await api.request('/ai/daily-insights', { method: 'POST' });
    var container = document.getElementById('insights-list');
    if (container && response.insight) {
      container.innerHTML = '<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">' + 
        response.insight.replace(/\n/g, '<br>') + '</div>';
    }
  } catch (e) {
    console.error('Erro ao carregar insights:', e);
  }
}

function showPrivacyMessage() {
  // Não usado no HTML atual
}

async function sendMsg() {
  var input = document.getElementById('chat-input');
  var msg = input.value.trim();
  if (!msg) return;
  
  var chat = document.getElementById('chat-msgs');
  if (!chat) return;
  
  chat.innerHTML += '<div class="msg msg-user"><span class="msg-user-label">VOCÊ</span>' + escapeHtml(msg) + '</div>';
  input.value = '';
  chat.scrollTop = chat.scrollHeight;
  
  var typing = document.getElementById('typing-ind');
  if (typing) typing.style.display = 'block';
  
  try {
    var response = await api.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        message: msg, 
        context: { 
          salary: currentUser?.salary || 0,
          billsCount: allBills.length,
          pendingBills: allBills.filter(function(b) { return b.status === 'pending'; }).length,
          lateBills: allBills.filter(function(b) { return b.status === 'late'; }).length
        }
      })
    });
    
    if (typing) typing.style.display = 'none';
    chat.innerHTML += '<div class="msg msg-ai"><span class="msg-ai-label">✦ TOBBY IA</span>' + escapeHtml(response.reply || 'Não entendi, pode repetir?') + '</div>';
    chat.scrollTop = chat.scrollHeight;
    chatHistory.push({ question: msg, answer: response.reply });
  } catch (e) {
    if (typing) typing.style.display = 'none';
    chat.innerHTML += '<div class="msg msg-ai"><span class="msg-ai-label">✦ TOBBY IA</span>Desculpe, tive um problema. Tente novamente.</div>';
    chat.scrollTop = chat.scrollHeight;
  }
}

function clearChat() {
  var chat = document.getElementById('chat-msgs');
  if (chat) {
    chat.innerHTML = '<div class="msg msg-ai"><span class="msg-ai-label">✦ TOBBY IA</span>Olá! Sou o assistente financeiro do Tobby 🐶. Como posso te ajudar?</div>';
  }
  chatHistory = [];
}

// ============================================
// DIÁRIO FINANCEIRO
// ============================================

async function loadJournal() {
  try {
    var response = await api.request('/journal');
    var container = document.getElementById('journal-list');
    if (!container) return;
    
    var entries = response.data || [];
    if (entries.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">Nenhum registro no diário. Comece a escrever!</div>';
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
      
      return '<div class="stat-card" style="padding:0.75rem;margin-bottom:0.5rem;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-weight:600;">' + moodEmoji + ' ' + escapeHtml(entry.text.substring(0, 100)) + (entry.text.length > 100 ? '...' : '') + '</span>' +
        '<span style="font-size:11px;color:var(--text-muted);">' + new Date(entry.entry_date).toLocaleDateString('pt-BR') + '</span>' +
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

// ============================================
// LINHA DO TEMPO DA VIDA
// ============================================

async function loadLifeEvents() {
  try {
    var response = await api.request('/life-events');
    var container = document.getElementById('timeline-list');
    if (!container) return;
    
    var events = response.data || [];
    if (events.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">Nenhum evento registrado. Marque sua história!</div>';
      return;
    }
    
    var grouped = response.grouped || {};
    var html = '';
    Object.keys(grouped).sort().reverse().forEach(function(year) {
      html += '<div style="margin-top:1rem;"><strong style="font-size:18px;">📅 ' + year + '</strong></div>';
      grouped[year].forEach(function(event) {
        var categoryEmoji = { career: '💼', family: '👨‍👩‍👧‍👦', education: '🎓', health: '🏥', finance: '💰', other: '📌' }[event.category] || '📌';
        html += '<div class="stat-card" style="padding:0.75rem;margin-bottom:0.5rem;">' +
          '<div style="display:flex;justify-content:space-between;">' +
          '<span style="font-weight:600;">' + categoryEmoji + ' ' + escapeHtml(event.title) + '</span>' +
          '<span style="font-size:11px;color:var(--text-muted);">' + new Date(event.event_date).toLocaleDateString('pt-BR') + '</span>' +
          '</div>' +
          (event.description ? '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">' + escapeHtml(event.description) + '</div>' : '') +
          '<button class="chip" onclick="deleteLifeEvent(\'' + event.id + '\')" style="font-size:10px;background:var(--red-bg);margin-top:4px;">🗑️</button>' +
          '</div>';
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

// ============================================
// PLANEJADOR DE APOSENTADORIA
// ============================================

async function loadRetirement() {
  try {
    var response = await api.request('/retirement');
    var container = document.getElementById('retirement-container');
    if (!container) return;
    
    var plan = response.data;
    if (!plan) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">' +
        '🏖️ Planeje sua aposentadoria<br>' +
        '<button class="btn-primary" style="margin-top:1rem;max-width:200px;" onclick="openRetirementModal()">Começar planejamento</button>' +
        '</div>';
      return;
    }
    
    var sim = plan.simulation_result || {};
    container.innerHTML = '<div class="stats-grid" style="grid-template-columns:1fr 1fr;gap:0.5rem;">' +
      '<div class="stat-card"><div class="stat-label">Idade Atual</div><div class="stat-value" style="font-size:18px;">' + plan.current_age + ' anos</div></div>' +
      '<div class="stat-card"><div class="stat-label">Aposentadoria</div><div class="stat-value" style="font-size:18px;">' + plan.retirement_age + ' anos</div></div>' +
      '<div class="stat-card"><div class="stat-label">Patrimônio Futuro</div><div class="stat-value" style="font-size:16px;color:var(--green);">' + fmt(sim.futureValue || 0) + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Renda Mensal</div><div class="stat-value" style="font-size:16px;color:var(--blue);">' + fmt(sim.monthlyIncome || 0) + '</div></div>' +
      '</div>' +
      '<div style="margin-top:1rem;">' +
      '<button class="btn-secondary" style="width:100%;" onclick="openRetirementModal()">✏️ Editar plano</button>' +
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

// ============================================
// MISSÕES
// ============================================

async function loadMissions() {
  try {
    var response = await api.request('/missions');
    var container = document.getElementById('missions-list');
    if (!container) return;
    
    var missions = response.data || [];
    if (missions.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">' +
        '🎯 Nenhuma missão para esta semana<br>' +
        '<button class="btn-primary" style="margin-top:1rem;max-width:200px;" onclick="generateMissions()">Gerar missões com IA</button>' +
        '</div>';
      return;
    }
    
    container.innerHTML = missions.map(function(mission) {
      var statusEmoji = { pending: '⏳', in_progress: '🔄', completed: '✅', failed: '❌' }[mission.status] || '⏳';
      var progress = mission.progress || 0;
      return '<div class="stat-card" style="margin-bottom:0.5rem;">' +
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
// PERFIL - CATEGORIAS
// ============================================

async function loadCategories() {
  try {
    var response = await api.request('/categories');
    allCategories = response.categories || [];
    renderCategories();
  } catch (e) {
    console.error('Erro ao carregar categorias:', e);
  }
}

function renderCategories() {
  var container = document.getElementById('categories-list');
  if (!container) return;
  
  if (allCategories.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);">Nenhuma categoria personalizada</div>';
    return;
  }
  
  container.innerHTML = allCategories.map(function(c, index) {
    var color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:var(--bg-secondary);border-radius:8px;margin-bottom:0.5rem;border-left:3px solid ' + color + ';">' +
      '<div><span style="font-size:20px;">' + (c.emoji || '📌') + '</span> ' + escapeHtml(c.name) + '</div>' +
      '<div><button class="chip" onclick="editCategory(\'' + c.id + '\')" style="font-size:10px;">✏️</button>' +
      '<button class="chip" onclick="deleteCategory(\'' + c.id + '\')" style="font-size:10px;background:var(--red-bg);">🗑️</button></div>' +
      '</div>';
  }).join('');
}

function openCategoryModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>📂 Nova Categoria</h3>' +
    '<div class="field"><label>Nome</label><input type="text" id="cat-name" placeholder="Ex: Supermercado"></div>' +
    '<div class="field"><label>Emoji</label><input type="text" id="cat-emoji" placeholder="🛒" maxlength="2"></div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveCategory()">Salvar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveCategory() {
  var name = document.getElementById('cat-name').value.trim();
  var emoji = document.getElementById('cat-emoji').value.trim() || '📌';
  if (!name) { showToast('Digite o nome da categoria'); return; }
  try {
    await api.request('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, emoji })
    });
    showToast('Categoria criada! 📂');
    document.querySelector('.modal-overlay').remove();
    loadCategories();
  } catch (e) {
    showToast('Erro ao criar categoria');
  }
}

async function editCategory(id) {
  var cat = allCategories.find(function(c) { return c.id === id; });
  if (!cat) return;
  var newName = prompt('Novo nome:', cat.name);
  if (newName === null) return;
  var newEmoji = prompt('Novo emoji:', cat.emoji || '📌');
  if (newEmoji === null) return;
  try {
    await api.request('/categories/' + id, {
      method: 'PUT',
      body: JSON.stringify({ name: newName.trim(), emoji: newEmoji.trim() })
    });
    showToast('Categoria atualizada!');
    loadCategories();
  } catch (e) {
    showToast('Erro ao atualizar');
  }
}

async function deleteCategory(id) {
  if (!confirm('Remover esta categoria?')) return;
  try {
    await api.request('/categories/' + id, { method: 'DELETE' });
    showToast('Categoria removida');
    loadCategories();
  } catch (e) {
    showToast('Erro ao remover');
  }
}

// ============================================
// PERFIL - FERRAMENTAS (Stubs)
// ============================================

function openReceiptScanner() {
  showToast('📸 Funcionalidade em desenvolvimento');
}

function showHollerithModal() {
  showToast('📄 Funcionalidade em desenvolvimento');
}

function showBankExtractModal() {
  showToast('🏦 Funcionalidade em desenvolvimento');
}

function showIncomeReport() {
  showToast('📊 Funcionalidade em desenvolvimento');
}

// ============================================
// PERFIL - SALÁRIO
// ============================================

async function editSalary() {
  var current = currentUser ? currentUser.salary : 0;
  var newSalary = prompt('Digite seu salário mensal:', current);
  if (newSalary === null) return;
  var salary = parseFloat(newSalary);
  if (isNaN(salary) || salary < 0) { showToast('Valor inválido'); return; }
  try {
    await api.updateSalary(salary);
    currentUser.salary = salary;
    updateUserUI();
    showToast('Salário atualizado!');
    loadHome();
  } catch (e) {
    showToast('Erro ao atualizar');
  }
}

// ============================================
// METAS FINANCEIRAS (Stubs - complementares) - CORRIGIDO
// ============================================

function openGoalModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>🎯 Nova Meta</h3>' +
    '<div class="field"><label>Nome da Meta</label><input type="text" id="goal-name" placeholder="Ex: Viagem para Europa"></div>' +
    '<div class="field"><label>Valor Alvo (R$)</label><input type="number" id="goal-target" step="0.01" placeholder="10000"></div>' +
    '<div class="field"><label>Valor Atual (R$)</label><input type="number" id="goal-current" step="0.01" placeholder="0"></div>' +
    '<div class="field"><label>Data Limite</label><input type="date" id="goal-deadline"></div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="saveGoal()">Salvar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function saveGoal() {
  var name = document.getElementById('goal-name').value.trim();
  var target_amount = parseFloat(document.getElementById('goal-target').value);
  var current_amount = parseFloat(document.getElementById('goal-current').value) || 0;
  var deadline = document.getElementById('goal-deadline').value;
  
  if (!name || !target_amount || !deadline) { showToast('Preencha todos os campos'); return; }
  
  try {
    await api.request('/financial-goals', {
      method: 'POST',
      body: JSON.stringify({ name, target_amount, current_amount, deadline })
    });
    showToast('Meta criada! 🎯');
    document.querySelector('.modal-overlay').remove();
    loadGoals();
  } catch (e) {
    showToast('Erro ao criar meta');
  }
}

async function updateGoalProgress(id) {
  var newAmount = prompt('Digite o valor atual:', '0');
  if (newAmount === null) return;
  var amount = parseFloat(newAmount);
  if (isNaN(amount) || amount < 0) { showToast('Valor inválido'); return; }
  try {
    await api.request('/financial-goals/' + id, {
      method: 'PUT',
      body: JSON.stringify({ current_amount: amount })
    });
    showToast('Progresso atualizado!');
    loadGoals();
  } catch (e) {
    showToast('Erro ao atualizar');
  }
}

async function deleteGoal(id) {
  if (!confirm('Remover esta meta?')) return;
  try {
    await api.request('/financial-goals/' + id, { method: 'DELETE' });
    showToast('Meta removida');
    loadGoals();
  } catch (e) {
    showToast('Erro ao remover');
  }
}

// ============================================
// FUNÇÕES ADICIONAIS PARA O HTML
// ============================================

function processHollerith() {
  showToast('⏳ Processando holerite...');
}

function processBankExtract() {
  showToast('⏳ Processando extrato...');
}

function showHollerithModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>📄 Ler Holerite</h3>' +
    '<div class="field"><label>Cole o texto do holerite</label>' +
    '<textarea id="hollerith-text" rows="6" placeholder="Cole aqui o texto do seu holerite..."></textarea></div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="processHollerith()">Processar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

function showBankExtractModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal">' +
    '<div class="modal-handle"></div>' +
    '<h3>🏦 Importar Extrato</h3>' +
    '<div class="field"><label>Cole o texto do extrato</label>' +
    '<textarea id="extract-text" rows="6" placeholder="Cole aqui o texto do seu extrato..."></textarea></div>' +
    '<div class="field"><label>Formato</label>' +
    '<select id="extract-format"><option value="text">Texto</option><option value="csv">CSV</option><option value="ofx">OFX</option></select></div>' +
    '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
    '<button class="btn-primary" style="flex:1" onclick="processBankExtract()">Processar</button>' +
    '<button class="btn-secondary" style="flex:1" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

function showIncomeReport() {
  showToast('📊 Gerando informe de rendimentos...');
}

function openReceiptScanner() {
  showToast('📸 Funcionalidade em desenvolvimento');
}

// ============================================
// FUNÇÕES DE METAS (complementares) - CORRIGIDO
// ============================================

async function loadGoalsList() {
  try {
    var response = await api.request('/financial-goals');
    var goals = response.goals || [];
    var container = document.getElementById('goals-list-full');
    if (!container) {
      container = document.getElementById('goals-list');
    }
    if (!container) return;
    
    if (goals.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);">Nenhuma meta cadastrada</div>';
      return;
    }
    
    container.innerHTML = goals.map(function(g) {
      var progress = g.target_amount > 0 ? (g.current_amount / g.target_amount * 100) : 0;
      return '<div class="stat-card" style="margin-bottom:0.5rem;">' +
        '<div style="display:flex;justify-content:space-between;">' +
        '<span style="font-weight:600;">' + escapeHtml(g.name) + '</span>' +
        '<span style="font-size:12px;color:var(--text-muted);">' + g.status + '</span>' +
        '</div>' +
        '<div style="font-size:14px;margin:4px 0;">' + fmt(g.current_amount) + ' / ' + fmt(g.target_amount) + '</div>' +
        '<div style="height:4px;background:var(--border);border-radius:2px;">' +
        '<div style="width:' + Math.min(progress, 100) + '%;height:100%;background:var(--blue);border-radius:2px;"></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
        '<button class="chip" onclick="updateGoalProgress(\'' + g.id + '\')" style="font-size:10px;">📈 Atualizar</button>' +
        '<button class="chip" onclick="deleteGoal(\'' + g.id + '\')" style="font-size:10px;background:var(--red-bg);">🗑️</button>' +
        '</div>' +
        '</div>';
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar metas:', e);
  }
}

// ============================================
// FUNÇÕES DE CATEGORIAS (complementares)
// ============================================

async function updateCategory(id) {
  var cat = allCategories.find(function(c) { return c.id === id; });
  if (!cat) return;
  var newName = prompt('Novo nome:', cat.name);
  if (newName === null) return;
  var newEmoji = prompt('Novo emoji:', cat.emoji || '📌');
  if (newEmoji === null) return;
  try {
    await api.request('/categories/' + id, {
      method: 'PUT',
      body: JSON.stringify({ name: newName.trim(), emoji: newEmoji.trim() })
    });
    showToast('Categoria atualizada!');
    loadCategories();
  } catch (e) {
    showToast('Erro ao atualizar');
  }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

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
      api.clearToken();
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

// ============================================
// EXPORTAÇÕES PARA O ESCOPO GLOBAL (window)
// ============================================

window.processHollerith = processHollerith;
window.processBankExtract = processBankExtract;
window.showHollerithModal = showHollerithModal;
window.showBankExtractModal = showBankExtractModal;
window.showIncomeReport = showIncomeReport;
window.openReceiptScanner = openReceiptScanner;
window.loadGoalsList = loadGoalsList;
window.updateCategory = updateCategory;
window.registerServiceWorker = registerServiceWorker;

console.log('🐶 Tobby Frontend v9.0 - Todas as funções carregadas!');