// 🐶 Tobby API Client v4.0
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

  async getInvestmentNews() {
    return this.request('/investment/news');
  }

  async getRecommendations() {
    return this.request('/investment/recommendations');
  }

  async processBankExtract(extractText, format = 'text') {
    return this.request('/bank/process', {
      method: 'POST',
      body: JSON.stringify({ extractText, format })
    });
  }

  async uploadAIDocument(file) {
    const formData = new FormData();
    formData.append('document', file);
    
    const response = await fetch(`${API_BASE}/ai-document/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }

  async processAIDocumentUrl(fileUrl) {
    return this.request('/ai-document/process-url', {
      method: 'POST',
      body: JSON.stringify({ fileUrl })
    });
  }
}

const api = new TobbyAPI();