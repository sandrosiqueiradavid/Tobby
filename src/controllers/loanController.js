const supabase = require('../db/supabase');

const loanController = {
  getLoans: async (req, res) => {
    try {
      const { data: loans, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', req.userId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const totalDebt = loans?.reduce((sum, l) => sum + l.outstanding_balance, 0) || 0;
      const totalMonthlyPayment = loans?.reduce((sum, l) => sum + (l.monthly_payment || 0), 0) || 0;

      res.json({
        loans: loans || [],
        summary: { totalDebt, totalMonthlyPayment }
      });
    } catch (err) {
      console.error('Get loans error:', err);
      res.status(500).json({ error: 'Erro ao buscar financiamentos' });
    }
  },

  createLoan: async (req, res) => {
    try {
      const { name, type, totalPrincipal, outstandingBalance, interestRate, remainingInstallments, startDate, monthlyPayment } = req.body;

      if (!name || !totalPrincipal || !outstandingBalance || !interestRate || !remainingInstallments || !startDate) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando' });
      }

      const { data, error } = await supabase
        .from('loans')
        .insert({
          user_id: req.userId,
          name,
          type: type || 'personal',
          total_principal: totalPrincipal,
          outstanding_balance: outstandingBalance,
          interest_rate: interestRate,
          remaining_installments: remainingInstallments,
          start_date: startDate,
          monthly_payment: monthlyPayment || null,
          amortization_type: 'price'
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Create loan error:', err);
      res.status(500).json({ error: 'Erro ao cadastrar financiamento' });
    }
  },

  simulateExtraPayment: async (req, res) => {
    try {
      const { id } = req.params;
      const { extraAmount } = req.body;

      const { data: loan } = await supabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (!loan) {
        return res.status(404).json({ error: 'Financiamento não encontrado' });
      }

      const rate = loan.interest_rate / 100;
      const newBalance = Math.max(0, loan.outstanding_balance - extraAmount);
      const monthlyPayment = loan.monthly_payment;
      
      let newInstallments;
      if (monthlyPayment && rate > 0) {
        newInstallments = Math.ceil(Math.log(monthlyPayment / (monthlyPayment - rate * newBalance)) / Math.log(1 + rate));
      } else {
        newInstallments = loan.remaining_installments;
      }

      const monthsSaved = Math.max(0, loan.remaining_installments - newInstallments);
      const originalInterest = (loan.monthly_payment * loan.remaining_installments) - loan.outstanding_balance;
      const newInterest = (loan.monthly_payment * newInstallments) - newBalance;
      const interestSaved = Math.max(0, originalInterest - newInterest);

      res.json({
        currentBalance: loan.outstanding_balance,
        newBalance,
        currentInstallments: loan.remaining_installments,
        newInstallments: Math.ceil(newInstallments),
        monthsSaved,
        interestSaved,
        monthlyPayment: loan.monthly_payment
      });
    } catch (err) {
      console.error('Simulate extra payment error:', err);
      res.status(500).json({ error: 'Erro na simulação' });
    }
  },

  deleteLoan: async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('Delete loan error:', err);
      res.status(500).json({ error: 'Erro ao deletar financiamento' });
    }
  }
};

module.exports = loanController;