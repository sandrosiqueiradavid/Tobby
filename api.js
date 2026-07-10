// api.js - Tobby API Client v9.0
const API_BASE = 'https://tobby-api.onrender.com/api';

class TobbyAPI {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = this.getHeaders();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (response.status === 401) {
        this.clearToken();
        throw new Error('Sessão expirada, faça login novamente');
      }

      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP ${response.status}`);
      }
      
      return data;
    } catch (err) {
      console.error(`[API] Erro ${endpoint}:`, err);
      throw err;
    }
  }

  // ============================================
  // AUTH
  // ============================================
  async register(name, email, password, salary) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, salary })
    });
    if (data.token) this.setToken(data.token);
    return data.user;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) this.setToken(data.token);
    return data.user;
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(token, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  // ============================================
  // USER
  // ============================================
  async getProfile() {
    return this.request('/user/profile');
  }

  async updateSalary(salary) {
    return this.request('/user/salary', {
      method: 'PUT',
      body: JSON.stringify({ salary })
    });
  }

  // ============================================
  // BILLS - CORRIGIDO
  // ============================================
  async getBills(status = null) {
    const url = status ? `/bills?status=${status}` : '/bills';
    const data = await this.request(url);
    return data.data || [];
  }

  async createBill(name, value, due_day, category, status) {
    return this.request('/bills', {
      method: 'POST',
      body: JSON.stringify({ name, value, due_day, category, status })
    });
  }

  async updateBill(id, name, value, due_day, category, status) {
    return this.request(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, value, due_day, category, status })
    });
  }

  async deleteBill(id) {
    return this.request(`/bills/${id}`, { method: 'DELETE' });
  }

  async updateBillStatus(id, status) {
    return this.request(`/bills/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async getDashboard() {
    return this.request('/bills/dashboard-summary');
  }

  // ============================================
  // INVESTMENTS
  // ============================================
  async getInvestments() {
    return this.request('/investments');
  }

  async createInvestment(data) {
    return this.request('/investments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteInvestment(id) {
    return this.request(`/investments/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // LOANS
  // ============================================
  async getLoans() {
    return this.request('/loans');
  }

  async createLoan(data) {
    return this.request('/loans', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteLoan(id) {
    return this.request(`/loans/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // WEALTH
  // ============================================
  async getWealthSummary() {
    return this.request('/wealth/summary');
  }

  async getAssets() {
    return this.request('/wealth/assets');
  }

  async createAsset(data) {
    return this.request('/wealth/assets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteAsset(id) {
    return this.request(`/wealth/assets/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // HOLLERITH
  // ============================================
  async processHollerith(hollerithText) {
    return this.request('/hollerith/process', {
      method: 'POST',
      body: JSON.stringify({ hollerithText })
    });
  }

  // ============================================
  // BANK
  // ============================================
  async processBankExtract(extractText, format) {
    return this.request('/bank/process', {
      method: 'POST',
      body: JSON.stringify({ extractText, format })
    });
  }

  // ============================================
  // CATEGORIES
  // ============================================
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // GOALS - CORRIGIDO
  // ============================================
  async getGoals() {
    return this.request('/financial-goals');
  }

  async createGoal(data) {
    return this.request('/financial-goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateGoal(id, data) {
    return this.request(`/financial-goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteGoal(id) {
    return this.request(`/financial-goals/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // EMERGENCY FUND
  // ============================================
  async getEmergencyFund() {
    return this.request('/emergency-fund');
  }

  async updateEmergencyFund(data) {
    return this.request('/emergency-fund', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // ============================================
  // SCORE
  // ============================================
  async getScore() {
    return this.request('/score');
  }

  // ============================================
  // AI
  // ============================================
  async sendMessage(message, context) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }

  async getDailyInsights() {
    return this.request('/ai/daily-insights', { method: 'POST' });
  }

  // ============================================
  // BRIEFING
  // ============================================
  async getMorningBriefing() {
    return this.request('/briefing/morning');
  }

  // ============================================
  // MISSIONS
  // ============================================
  async getMissions() {
    return this.request('/missions');
  }

  async generateMissions() {
    return this.request('/missions/generate', { method: 'POST' });
  }

  async updateMissionProgress(id, progress) {
    return this.request(`/missions/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ progress })
    });
  }

  async completeMission(id) {
    return this.request(`/missions/${id}/complete`, { method: 'POST' });
  }

  // ============================================
  // JOURNAL
  // ============================================
  async getJournal() {
    return this.request('/journal');
  }

  async createJournal(data) {
    return this.request('/journal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async analyzeJournal(id) {
    return this.request(`/journal/${id}/analyze`, { method: 'POST' });
  }

  async deleteJournal(id) {
    return this.request(`/journal/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // LIFE EVENTS
  // ============================================
  async getLifeEvents() {
    return this.request('/life-events');
  }

  async createLifeEvent(data) {
    return this.request('/life-events', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteLifeEvent(id) {
    return this.request(`/life-events/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // RETIREMENT
  // ============================================
  async getRetirement() {
    return this.request('/retirement');
  }

  async saveRetirement(data) {
    return this.request('/retirement', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ============================================
  // COUPLE
  // ============================================
  async getCouple() {
    return this.request('/couple');
  }

  async createCouple(data) {
    return this.request('/couple/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ============================================
  // BEHAVIOR
  // ============================================
  async getAlerts() {
    return this.request('/behavior/alerts');
  }

  async markAlertRead(id) {
    return this.request(`/behavior/alerts/${id}/read`, {
      method: 'PATCH'
    });
  }

  // ============================================
  // EXECUTIVE
  // ============================================
  async getExecutiveDashboard() {
    return this.request('/executive');
  }

  // ============================================
  // RISKS
  // ============================================
  async getRisks() {
    return this.request('/risks');
  }

  async analyzeRisks() {
    return this.request('/risks/analyze', { method: 'POST' });
  }

  async resolveRisk(id) {
    return this.request(`/risks/${id}/resolve`, {
      method: 'PATCH'
    });
  }

  // ============================================
  // TOBBY MEMORY
  // ============================================
  async getRelevantMemories() {
    return this.request('/tobby-memory/relevant');
  }

  async extractMemory(data) {
    return this.request('/tobby-memory/extract', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ============================================
  // MENTOR
  // ============================================
  async createMentorPlan(data) {
    return this.request('/mentor/create-plan', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMentorPlan() {
    return this.request('/mentor/current-plan');
  }

  async updateMentorProgress(data) {
    return this.request('/mentor/update-progress', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async getMentorHistory() {
    return this.request('/mentor/history');
  }

  // ============================================
  // ACHIEVEMENTS
  // ============================================
  async getAchievements() {
    return this.request('/achievements');
  }

  async getUserProgress() {
    return this.request('/achievements/progress');
  }
}

const api = new TobbyAPI();