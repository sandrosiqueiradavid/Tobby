/**
 * 🐶 Tobby API Client
 * Gerencia todas as requisições para o backend
 */

const API_BASE = 'http://localhost:3000/api'; // Mude para produção

class TobbyAPI {
  constructor() {
    this.token = localStorage.getItem('token');
    this.userId = localStorage.getItem('userId');
  }

  // Armazenar token
  setToken(token, userId) {
    this.token = token;
    this.userId = userId;
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
  }

  // Remover token (logout)
  clearToken() {
    this.token = null;
    this.userId = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  }

  // Headers padrão
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  // Requisição genérica com tratamento de erro
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado ou inválido
          this.clearToken();
          window.location.href = '/';
          throw new Error('Sessão expirada');
        }
        const error = await response.json();
        throw new Error(error.error || 'Erro na requisição');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  }

  // ===== AUTH =====

  /**
   * POST /api/auth/register
   * Registrar novo usuário
   */
  async register(name, email, password, salary = 0) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, salary })
    });
    if (data.token) {
      this.setToken(data.token, data.user.id);
    }
    return data.user;
  }

  /**
   * POST /api/auth/login
   * Fazer login
   */
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      this.setToken(data.token, data.user.id);
    }
    return data.user;
  }

  // ===== USER =====

  /**
   * GET /api/user/profile
   * Obter perfil do usuário autenticado
   */
  async getProfile() {
    return this.request('/user/profile');
  }

  /**
   * PUT /api/user/salary
   * Atualizar salário mensal
   */
  async updateSalary(salary) {
    return this.request('/user/salary', {
      method: 'PUT',
      body: JSON.stringify({ salary })
    });
  }

  // ===== BILLS =====

  /**
   * GET /api/bills
   * Listar todas as contas do usuário
   * @param {string} status - Filtrar por status: 'pending', 'paid', 'late'
   * @param {string} sort - Ordenar por: 'due_day', 'value', 'created_at', 'status'
   * @param {number} limit - Limite de resultados (padrão: 50)
   * @param {number} offset - Deslocar resultados (padrão: 0)
   */
  async getBills(status = null, sort = 'due_day', limit = 50, offset = 0) {
    let url = `/bills?sort=${sort}&limit=${limit}&offset=${offset}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.request(url);
  }

  /**
   * GET /api/bills/:id
   * Obter uma conta específica
   */
  async getBill(id) {
    return this.request(`/bills/${id}`);
  }

  /**
   * POST /api/bills
   * Criar nova conta
   */
  async createBill(name, value, due_day, category = 'outros', status = 'pending') {
    return this.request('/bills', {
      method: 'POST',
      body: JSON.stringify({
        name,
        value,
        due_day,
        category,
        status
      })
    });
  }

  /**
   * PUT /api/bills/:id
   * Atualizar uma conta existente
   */
  async updateBill(id, name, value, due_day, category, status) {
    return this.request(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        value,
        due_day,
        category,
        status
      })
    });
  }

  /**
   * DELETE /api/bills/:id
   * Deletar uma conta
   */
  async deleteBill(id) {
    return this.request(`/bills/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * PATCH /api/bills/:id/status
   * Atualizar apenas o status da conta
   */
  async updateBillStatus(id, status) {
    return this.request(`/bills/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // ===== DASHBOARD =====

  /**
   * GET /api/bills/dashboard/summary
   * Obter resumo do dashboard
   * Retorna: salary, totalBills, paidBills, pendingBills, lateBills, freeBalance, percentageCommitted
   */
  async getDashboard() {
    return this.request('/bills/dashboard/summary');
  }
}

// Criar instância global
const api = new TobbyAPI();
