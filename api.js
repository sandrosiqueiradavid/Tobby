// 🐶 Tobby API Client v5.0
const API_BASE = 'https://tobby-api.onrender.com/api';

class TobbyAPI {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (response.status === 401 && !endpoint.includes('/auth/')) {
        this.clearToken();
        if (typeof window.showAuth === 'function') window.showAuth();
        throw new Error('Sessão expirada, faça login novamente');
      }

      if (!response.ok) throw new Error(data.error || 'Erro na requisição');
      return data;
    } catch (err) {
      throw err;
    }
  }

  // Auth
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
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return response.json();
  }

  async resetPassword(token, newPassword) {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    return response.json();
  }

  // Bills
  async getBills(status = null) {
    const url = status ? `/bills?status=${status}` : '/bills';
    const data = await this.request(url);
    return data.data;
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

  // User
  async getProfile() {
    return this.request('/user/profile');
  }

  async updateSalary(salary) {
    return this.request('/user/salary', {
      method: 'PUT',
      body: JSON.stringify({ salary })
    });
  }

  // Hollerith
  async processHollerith(hollerithText) {
    return this.request('/hollerith/process', {
      method: 'POST',
      body: JSON.stringify({ hollerithText })
    });
  }

  async getIncomeReport(year) {
    const url = year ? `/hollerith/report?year=${year}` : '/hollerith/report';
    return this.request(url);
  }

  async getIRDeclaration(year) {
    const url = year ? `/hollerith/ir-declaration?year=${year}` : '/hollerith/ir-declaration';
    return this.request(url);
  }

  // Investments
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

  // Bank
  async processBankExtract(extractText, format = 'text') {
    return this.request('/bank/process', {
      method: 'POST',
      body: JSON.stringify({ extractText, format })
    });
  }

  // Loans
  async getLoans() {
    return this.request('/loans');
  }

  async createLoan(data) {
    return this.request('/loans', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async simulateLoan(id, extraAmount) {
    return this.request(`/loans/${id}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ extraAmount })
    });
  }

  async deleteLoan(id) {
    return this.request(`/loans/${id}`, { method: 'DELETE' });
  }

  // Wealth
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
}

const api = new TobbyAPI();