// Tobby API Client v7.0 - CORRIGIDO
const API_BASE = 'https://tobby-api.onrender.com/api';

class TobbyAPI {
  constructor() {
    this.token = localStorage.getItem('token');
    console.log('[API] Inicializado, token presente:', !!this.token);
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
      console.log('[API] Token salvo');
    } else {
      localStorage.removeItem('token');
      console.log('[API] Token removido');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
    console.log('[API] Token limpo');
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
    
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { error: await response.text() };
      }

      if (response.status === 401) {
        console.log('[API] Token expirado, limpando...');
        this.clearToken();
        if (typeof window.showAuth === 'function') window.showAuth();
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

  // ===== AUTH =====
  async register(name, email, password, salary) {
    console.log('[API] Registrando usuário:', email);
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, salary })
    });
    if (data.token) this.setToken(data.token);
    return data.user;
  }

  async login(email, password) {
    console.log('[API] Login:', email);
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

  // ===== USER =====
  async getProfile() {
    return this.request('/user/profile');
  }

  async updateSalary(salary) {
    return this.request('/user/salary', {
      method: 'PUT',
      body: JSON.stringify({ salary })
    });
  }

  // ===== BILLS =====
  async getBills(status = null) {
    const url = status ? `/bills?status=${status}` : '/bills';
    const data = await this.request(url);
    return data.data || [];
  }

  async createBill(name, value, due_day, category, status) {
    console.log('[API] Criando conta:', name, value);
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
    return this.request('/bills/dashboard/summary');
  }

  // ===== INVESTMENTS =====
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

  // ===== LOANS =====
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

  // ===== WEALTH =====
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

  // ===== HOLLERITH =====
  async processHollerith(hollerithText) {
    return this.request('/hollerith/process', {
      method: 'POST',
      body: JSON.stringify({ hollerithText })
    });
  }

  // ===== BANK =====
  async processBankExtract(extractText, format) {
    return this.request('/bank/process', {
      method: 'POST',
      body: JSON.stringify({ extractText, format })
    });
  }

  // ===== CATEGORIES =====
  async getCategories() {
    return this.request('/categories');
  }

  // ===== GOALS =====
  async getGoals() {
    return this.request('/goals/goals');
  }

  async createGoal(data) {
    return this.request('/goals/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateGoal(id, data) {
    return this.request(`/goals/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteGoal(id) {
    return this.request(`/goals/goals/${id}`, { method: 'DELETE' });
  }

  // ===== EMERGENCY FUND =====
  async getEmergencyFund() {
    return this.request('/emergency-fund');
  }

  async updateEmergencyFund(data) {
    return this.request('/emergency-fund', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // ===== SCORE =====
  async getScore() {
    return this.request('/score');
  }

  // ===== AI =====
  async sendMessage(message, context) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }
}

const api = new TobbyAPI();