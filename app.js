* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

:root {
  --bg-primary: #0F172A;
  --bg-secondary: #1E293B;
  --bg-card: #334155;
  --bg-card-hover: #475569;
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --border: #334155;
  --green: #10B981;
  --green-dark: #059669;
  --red: #EF4444;
  --red-dark: #DC2626;
  --blue: #3B82F6;
  --purple: #8B5CF6;
  --orange: #F59E0B;
  --pink: #EC4899;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
  --transition: all 0.2s ease;
}

body.light-theme {
  --bg-primary: #F1F5F9;
  --bg-secondary: #FFFFFF;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F8FAFC;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --border: #E2E8F0;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  transition: var(--transition);
}

/* Layout */
.app-container {
  max-width: 500px;
  margin: 0 auto;
  position: relative;
  min-height: 100vh;
  background: var(--bg-primary);
}

.content {
  padding: 1rem;
  padding-bottom: 80px;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: center;
  padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom));
  z-index: 100;
  backdrop-filter: blur(10px);
  max-width: 500px;
  margin: 0 auto;
}

.nav-container {
  display: flex;
  gap: 0.25rem;
  width: 100%;
  justify-content: space-around;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
  color: var(--text-muted);
  max-width: 70px;
}

.nav-item.active {
  color: var(--green);
  background: rgba(16, 185, 129, 0.1);
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-icon {
  font-size: 22px;
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
}

/* Top Bar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--green), var(--blue));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.topbar-name {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--green), var(--blue));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
}

.icon-btn:active {
  transform: scale(0.95);
}

.avatar-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--purple), var(--pink));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* Balance Card */
.balance-card {
  background: linear-gradient(135deg, var(--bg-card), var(--bg-secondary));
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
}

.balance-label {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.balance-value {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 1rem;
  color: var(--green);
}

.balance-date {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.balance-details {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.balance-detail {
  flex: 1;
}

.balance-detail-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.balance-detail-value {
  font-size: 14px;
  font-weight: 700;
}

.balance-detail-value.positive {
  color: var(--green);
}

.balance-detail-value.negative {
  color: var(--red);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  font-size: 18px;
}

.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
}

.stat-sub {
  font-size: 9px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Chart Card */
.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1rem;
  margin-bottom: 1rem;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.donut {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(
    var(--blue) 0deg 198deg,
    var(--green) 198deg 263deg,
    var(--orange) 263deg 317deg,
    var(--purple) 317deg 360deg
  );
  flex-shrink: 0;
}

.chart-legend {
  flex: 1;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-label {
  flex: 1;
  color: var(--text-secondary);
}

.legend-value {
  font-weight: 600;
}

/* Indicators */
.indicators {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.indicator-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  text-align: center;
}

.indicator-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.indicator-value {
  font-size: 18px;
  font-weight: 700;
}

.indicator-value.small {
  font-size: 14px;
}

/* Transaction Items */
.transaction-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.875rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: var(--transition);
  cursor: pointer;
}

.transaction-item:active {
  transform: scale(0.99);
  background: var(--bg-card-hover);
}

.transaction-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.transaction-info {
  flex: 1;
}

.transaction-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.transaction-meta {
  font-size: 10px;
  color: var(--text-secondary);
}

.transaction-right {
  text-align: right;
}

.transaction-value {
  font-size: 14px;
  font-weight: 700;
}

.transaction-value.income {
  color: var(--green);
}

.transaction-value.expense {
  color: var(--red);
}

.transaction-status {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 20px;
  margin-top: 4px;
  display: inline-block;
}

.status-paid {
  background: rgba(16, 185, 129, 0.1);
  color: var(--green);
}

.status-pending {
  background: rgba(245, 158, 11, 0.1);
  color: var(--orange);
}

.status-late {
  background: rgba(239, 68, 68, 0.1);
  color: var(--red);
}

.transaction-actions {
  display: flex;
  gap: 8px;
  margin-left: 8px;
}

.transaction-action {
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
}

.transaction-action:active {
  transform: scale(0.9);
}

/* Section Header */
.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.section-header h3 {
  font-size: 14px;
  font-weight: 700;
}

.section-header a {
  font-size: 11px;
  color: var(--green);
  cursor: pointer;
  font-weight: 600;
}

/* Toby Card */
.toby-card {
  background: linear-gradient(135deg, var(--bg-card), var(--bg-secondary));
  border-radius: var(--radius-xl);
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
}

.toby-avatar {
  font-size: 48px;
  background: var(--bg-primary);
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toby-message {
  flex: 1;
}

.toby-message p {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.toby-message small {
  font-size: 10px;
  color: var(--text-secondary);
}

.toby-badge {
  background: rgba(16, 185, 129, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  color: var(--green);
}

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, var(--green), var(--green-dark));
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-family: inherit;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: var(--transition);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-secondary {
  width: 100%;
  padding: 13px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition);
}

.btn-danger {
  width: 100%;
  padding: 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--red);
  font-weight: 700;
  cursor: pointer;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal {
  background: var(--bg-secondary);
  border-radius: 24px 24px 0 0;
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
}

@media (min-width: 768px) {
  .modal-overlay {
    align-items: center;
  }
  .modal {
    border-radius: 24px;
    margin: 1rem;
  }
}

.modal-handle {
  width: 40px;
  height: 4px;
  background: var(--border);
  border-radius: 99px;
  margin: 0 auto 1rem;
}

.modal h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 1.25rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
}

.field input, .field select, textarea {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
}

.field input:focus, .field select:focus, textarea:focus {
  outline: none;
  border-color: var(--green);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

/* Auth */
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.auth-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

.auth-logo {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-mark {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--green), var(--blue));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 1rem;
}

.logo-title {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--green), var(--blue));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Filters */
.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-chip {
  padding: 6px 16px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.filter-chip.active {
  background: var(--green);
  color: white;
  border-color: var(--green);
}

/* Chat */
.chat-msgs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  max-height: 400px;
  overflow-y: auto;
}

.msg {
  max-width: 86%;
  padding: 0.75rem 1rem;
  border-radius: 18px;
  font-size: 13px;
  line-height: 1.5;
}

.msg-ai {
  background: var(--bg-card);
  border: 1px solid var(--border);
  align-self: flex-start;
  border-radius: 4px 18px 18px 18px;
}

.msg-ai-label {
  color: var(--green);
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 700;
}

.msg-user {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid var(--border);
  align-self: flex-end;
  border-radius: 18px 18px 4px 18px;
}

.chat-bar {
  display: flex;
  gap: 0.6rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 30px;
  padding: 0.5rem 0.75rem;
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  color: var(--text-primary);
}

.chat-send {
  background: var(--green);
  border: none;
  border-radius: 30px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 30px;
  padding: 0.65rem 1.1rem;
  font-size: 13px;
  z-index: 300;
  opacity: 0;
  transition: all 0.3s;
  pointer-events: none;
  white-space: nowrap;
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.hidden {
  display: none !important;
}

.screen {
  display: none;
  min-height: 100vh;
}

.screen.active {
  display: block;
}

/* Loading */
#loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  z-index: 1000;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--border);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--green);
  border-radius: 4px;
}

/* Score Card */
.score-card {
  background: linear-gradient(135deg, var(--purple), var(--pink));
  margin-bottom: 1rem;
  border-radius: var(--radius-xl);
  padding: 1rem;
  color: white;
}

/* Chips */
.chip {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}

.chip:active {
  transform: scale(0.95);
}

/* Category Badges */
.category-badge {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 4px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  transition: var(--transition);
}

.category-badge:active {
  transform: scale(0.95);
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
  setTimeout(() => loadCategoryOptions(), 100);
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

// ===== MENSAGEM DE PRIVACIDADE =====
function showPrivacyMessage() {
  const msgs = document.getElementById('chat-msgs');
  
  if (document.getElementById('privacy-msg')) return;
  
  const privacyMsg = `
    <div class="msg msg-ai" id="privacy-msg" style="background: rgba(16, 185, 129, 0.05); border: 1px solid var(--green);">
      <span class="msg-ai-label">🔒 PRIVACIDADE E SEGURANÇA</span>
      Seus dados são protegidos! 🔐<br><br>
      • Seus dados financeiros NÃO são armazenados pela IA<br>
      • Apenas o contexto da sua pergunta é enviado para análise<br>
      • A IA responde e tudo é descartado imediatamente<br>
      • Suas informações pessoais (nome, e-mail) NUNCA são compartilhadas<br><br>
      <span style="font-size: 11px; color: var(--text-muted);">✓ Chat 100% seguro e privado</span>
    </div>
  `;
  
  msgs.innerHTML = privacyMsg + msgs.innerHTML;
}

// ===== LIMPAR CHAT =====
function clearChat() {
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML = `
    <div class="msg msg-ai"><span class="msg-ai-label">✦ TOBBY IA</span>Olá! Sou o assistente financeiro do Tobby 🐶. Como posso te ajudar?</div>
  `;
  showPrivacyMessage();
  showToast('Conversa limpa! 🧹');
}

// ===== CHAT COM IA =====
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
    const totalCommitted = allBills.reduce((sum, b) => sum + b.value, 0);
    const salary = currentUser?.salary || 0;
    const commitmentPercent = salary > 0 ? (totalCommitted / salary) * 100 : 0;
    const freeMoney = salary - totalCommitted;
    
    const response = await api.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: q,
        context: {
          salary: salary,
          billsCount: allBills.length,
          pendingBills: pendingBills,
          lateBills: lateBills,
          totalCommitted: totalCommitted,
          commitmentPercent: commitmentPercent.toFixed(1),
          freeMoney: freeMoney
        }
      })
    });
    
    const reply = response.reply || 'Desculpe, não consegui processar sua mensagem.';
    document.getElementById('typing-ind').style.display = 'none';
    msgs.innerHTML += `<div class="msg msg-ai"><span class="msg-ai-label">✦ TOBBY IA</span>${reply}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
    
  } catch (e) {
    console.error('Erro no chat:', e);
    document.getElementById('typing-ind').style.display = 'none';
    msgs.innerHTML += `<div class="msg msg-ai"><span class="msg-ai-label">✦ TOBBY IA</span>⚠️ Desculpe, estou com dificuldades técnicas. Tente novamente em alguns instantes!</div>`;
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