// Tobby API Client v7.0
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
    
    console.log(`📡 ${options.method || 'GET'} ${url}`, { headers, body: options.body });
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (response.status === 401) {
        this.clearToken();
        if (typeof window.showAuth === 'function') window.showAuth();
        throw new Error('Sessão expirada, faça login novamente');
      }

      if (!response.ok) throw new Error(data.error || 'Erro na requisição');
      return data;
    } catch (err) {
      console.error(`❌ Erro na requisição ${endpoint}:`, err);
      throw err;
    }
  }

  // ===== AUTH =====
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

// Criar instância global
const api = new TobbyAPI();