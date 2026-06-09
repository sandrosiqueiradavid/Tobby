// 🐶 Tobby API Client v2.1
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

      // Só redireciona para login se for rota protegida (não login/register)
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        this.clearToken();
        showAuth();
        throw new Error('Sessão expirada, faça login novamente');
      }

      if (!response.ok) throw new Error(data.error || 'Erro na requisição');
      return data;
    } catch (err) {
      throw err;
    }
  }

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

  async updateSalary(salary) {
    return this.request('/user/salary', {
      method: 'PUT',
      body: JSON.stringify({ salary })
    });
  }

  async getProfile() {
    return this.request('/user/profile');
  }

  async getDashboard() {
    return this.request('/bills/dashboard/summary');
  }
}

const api = new TobbyAPI();
