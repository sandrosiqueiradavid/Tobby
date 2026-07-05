// src/controllers/retirementController.js
const supabase = require('../db/supabase');

const retirementController = {
  // ===== OBTER PLANO =====
  async getPlan(req, res) {
    try {
      const { data, error } = await supabase
        .from('retirement_plans')
        .select('*')
        .eq('user_id', req.userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error('Get retirement plan error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== CRIAR/ATUALIZAR PLANO =====
  async savePlan(req, res) {
    try {
      const { current_age, retirement_age, current_savings, monthly_contribution, expected_return } = req.body;

      if (!current_age || !retirement_age) {
        return res.status(400).json({ error: 'Idade atual e idade de aposentadoria são obrigatórias' });
      }

      const simulation = this.simulateRetirement({
        currentAge: current_age,
        retirementAge: retirement_age,
        currentSavings: current_savings || 0,
        monthlyContribution: monthly_contribution || 0,
        expectedReturn: expected_return || 8.0
      });

      const { data, error } = await supabase
        .from('retirement_plans')
        .upsert({
          user_id: req.userId,
          current_age,
          retirement_age,
          current_savings: current_savings || 0,
          monthly_contribution: monthly_contribution || 0,
          expected_return: expected_return || 8.0,
          simulation_result: simulation,
          updated_at: new Date()
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, data, simulation });
    } catch (err) {
      console.error('Save retirement plan error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== SIMULAR APOSENTADORIA =====
  simulateRetirement(params) {
    const { currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn } = params;
    
    const yearsToRetirement = retirementAge - currentAge;
    const monthsToRetirement = yearsToRetirement * 12;
    const monthlyRate = expectedReturn / 100 / 12;
    
    let futureValue = currentSavings;
    for (let i = 0; i < monthsToRetirement; i++) {
      futureValue = futureValue * (1 + monthlyRate) + monthlyContribution;
    }

    const annualWithdrawal = futureValue * 0.04;
    const monthlyIncome = annualWithdrawal / 12;

    return {
      futureValue: Math.round(futureValue * 100) / 100,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      totalContributions: monthlyContribution * monthsToRetirement,
      estimatedReturn: futureValue - (currentSavings + monthlyContribution * monthsToRetirement),
      yearsToRetirement,
      monthsToRetirement,
      monthlyRate: (monthlyRate * 100).toFixed(2),
      yearsOfFunds: 30,
      chartData: this.generateChartData(currentAge, retirementAge, currentSavings, monthlyContribution, monthlyRate, monthsToRetirement)
    };
  },

  generateChartData(currentAge, retirementAge, currentSavings, monthlyContribution, monthlyRate, monthsToRetirement) {
    const data = [];
    const years = retirementAge - currentAge;
    
    let value = currentSavings;
    for (let year = 0; year <= years; year++) {
      if (year > 0) {
        for (let month = 0; month < 12; month++) {
          value = value * (1 + monthlyRate) + monthlyContribution;
        }
      }
      data.push({
        year: currentAge + year,
        value: Math.round(value * 100) / 100
      });
    }
    return data;
  }
};

module.exports = retirementController;