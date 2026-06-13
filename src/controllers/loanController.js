const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

const loanController = {
  getLoans: async (req, res) => {
    try {
      const { data: loans, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', req.userId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const decryptedLoans = (loans || []).map(loan => ({
        ...loan,
        total_principal: decryptNumber(loan.total_principal_encrypted),
        outstanding_balance: decryptNumber(loan.outstanding_balance_encrypted),
        monthly_payment: decryptNumber(loan.monthly_payment_encrypted),
        total_principal_encrypted: undefined,
        outstanding_balance_encrypted: undefined,
        monthly_payment_encrypted: undefined
      }));

      const totalDebt = decryptedLoans.reduce((sum, l) => sum + l.outstanding_balance, 0);
      const totalMonthlyPayment = decryptedLoans.reduce((sum, l) => sum + (l.monthly_payment || 0), 0);

      res.json({ loans: decryptedLoans, summary: { totalDebt, totalMonthlyPayment } });
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
          total_principal_encrypted: encryptNumber(totalPrincipal),
          outstanding_balance_encrypted: encryptNumber(outstandingBalance),
          interest_rate: interestRate,
          remaining_installments: remainingInstallments,
          start_date: startDate,
          monthly_payment_encrypted: monthlyPayment ? encryptNumber(monthlyPayment) : null,
          amortization_type: 'price'
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        ...data,
        total_principal: totalPrincipal,
        outstanding_balance: outstandingBalance,
        monthly_payment: monthlyPayment,
        total_principal_encrypted: undefined,
        outstanding_balance_encrypted: undefined,
        monthly_payment_encrypted: undefined
      });
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

      const outstandingBalance = decryptNumber(loan.outstanding_balance_encrypted);
      const monthlyPayment = decryptNumber(loan.monthly_payment_encrypted);
      const rate = loan.interest_rate / 100;
      const newBalance = Math.max(0, outstandingBalance - extraAmount);

      let newInstallments;
      if (monthlyPayment && rate > 0) {
        newInstallments = Math.ceil(Math.log(monthlyPayment / (monthlyPayment - rate * newBalance)) / Math.log(1 + rate));
      } else {
        newInstallments = loan.remaining_installments;
      }

      const monthsSaved = Math.max(0, loan.remaining_installments - newInstallments);
      const originalInterest = (monthlyPayment * loan.remaining_installments) - outstandingBalance;
      const newInterest = (monthlyPayment * newInstallments) - newBalance;
      const interestSaved = Math.max(0, originalInterest - newInterest);

      res.json({
        currentBalance: outstandingBalance,
        newBalance,
        currentInstallments: loan.remaining_installments,
        newInstallments: Math.ceil(newInstallments),
        monthsSaved,
        interestSaved,
        monthlyPayment
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