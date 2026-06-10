const supabase = require('../db/supabase');

const loanController = {
  // Criar financiamento/dívida
  createLoan: async (req, res) => {
    try {
      const {
        name, type, totalPrincipal, outstandingBalance,
        interestRate, amortizationType, monthlyPayment,
        remainingInstallments, startDate
      } = req.body;

      if (!name || !totalPrincipal || !outstandingBalance || !interestRate || !startDate) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando' });
      }

      // Calcular prestação se não informada
      let calculatedPayment = monthlyPayment;
      let calculatedInstallments = remainingInstallments;

      if (!calculatedPayment && amortizationType === 'price') {
        calculatedPayment = calculatePMT(interestRate / 100, remainingInstallments, outstandingBalance);
      }

      if (!calculatedInstallments && monthlyPayment) {
        calculatedInstallments = calculateNper(interestRate / 100, monthlyPayment, outstandingBalance);
      }

      const { data, error } = await supabase
        .from('loans')
        .insert({
          user_id: req.userId,
          name,
          type,
          total_principal: totalPrincipal,
          outstanding_balance: outstandingBalance,
          interest_rate: interestRate,
          amortization_type: amortizationType || 'price',
          monthly_payment: calculatedPayment || null,
          remaining_installments: calculatedInstallments || null,
          start_date: startDate,
          extra_payment: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Gerar tabela de amortização
      const amortizationTable = generateAmortizationTable(data);

      res.status(201).json({ loan: data, amortizationTable });
    } catch (err) {
      console.error('Create loan error:', err);
      res.status(500).json({ error: 'Erro ao cadastrar financiamento' });
    }
  },

  // Listar financiamentos/dívidas
  getLoans: async (req, res) => {
    try {
      const { data: loans, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', req.userId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Calcular métricas para cada dívida
      const enrichedLoans = loans.map(loan => {
        const totalInterest = loan.monthly_payment * loan.remaining_installments - loan.outstanding_balance;
        const payoffDate = new Date();
        payoffDate.setMonth(payoffDate.getMonth() + loan.remaining_installments);
        
        return {
          ...loan,
          total_interest: totalInterest,
          payoff_date: payoffDate,
          percent_paid: ((loan.total_principal - loan.outstanding_balance) / loan.total_principal) * 100
        };
      });

      const summary = {
        totalDebt: enrichedLoans.reduce((sum, l) => sum + l.outstanding_balance, 0),
        totalMonthlyPayment: enrichedLoans.reduce((sum, l) => sum + (l.monthly_payment || 0), 0),
        totalInterest: enrichedLoans.reduce((sum, l) => sum + l.total_interest, 0),
        byType: {}
      };

      enrichedLoans.forEach(loan => {
        if (!summary.byType[loan.type]) {
          summary.byType[loan.type] = { total: 0, count: 0 };
        }
        summary.byType[loan.type].total += loan.outstanding_balance;
        summary.byType[loan.type].count++;
      });

      res.json({ loans: enrichedLoans, summary });
    } catch (err) {
      console.error('Get loans error:', err);
      res.status(500).json({ error: 'Erro ao buscar financiamentos' });
    }
  },

  // Simular amortização extra
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
      const newBalance = loan.outstanding_balance - extraAmount;
      
      let newInstallments;
      if (loan.amortization_type === 'price') {
        newInstallments = calculateNper(rate, loan.monthly_payment, newBalance);
      } else {
        // SAC - reduz número de parcelas
        const amortization = loan.outstanding_balance / loan.remaining_installments;
        newInstallments = Math.ceil(newBalance / amortization);
      }

      const monthsSaved = loan.remaining_installments - newInstallments;
      const interestSaved = (loan.monthly_payment * loan.remaining_installments - loan.outstanding_balance) -
                           (loan.monthly_payment * newInstallments - newBalance);

      res.json({
        currentBalance: loan.outstanding_balance,
        newBalance,
        currentInstallments: loan.remaining_installments,
        newInstallments: Math.ceil(newInstallments),
        monthsSaved: Math.max(0, monthsSaved),
        interestSaved: Math.max(0, interestSaved),
        monthlyPayment: loan.monthly_payment
      });
    } catch (err) {
      console.error('Simulate extra payment error:', err);
      res.status(500).json({ error: 'Erro na simulação' });
    }
  },

  // Aplicar amortização extra
  applyExtraPayment: async (req, res) => {
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
      
      let newInstallments;
      if (loan.amortization_type === 'price') {
        newInstallments = calculateNper(rate, loan.monthly_payment, newBalance);
      } else {
        const amortization = loan.outstanding_balance / loan.remaining_installments;
        newInstallments = Math.ceil(newBalance / amortization);
      }

      const { data, error } = await supabase
        .from('loans')
        .update({
          outstanding_balance: newBalance,
          remaining_installments: Math.ceil(newInstallments),
          extra_payment: (loan.extra_payment || 0) + extraAmount,
          updated_at: new Date()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, loan: data });
    } catch (err) {
      console.error('Apply extra payment error:', err);
      res.status(500).json({ error: 'Erro ao aplicar amortização' });
    }
  },

  // Deletar financiamento
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
      res.status(500).json({ error: 'Erro ao deletar financiamento' });
    }
  }
};

// Funções financeiras auxiliares
function calculatePMT(rate, nper, pv) {
  if (rate === 0) return pv / nper;
  const payment = (rate * pv) / (1 - Math.pow(1 + rate, -nper));
  return Math.abs(payment);
}

function calculateNper(rate, pmt, pv) {
  if (rate === 0) return pv / pmt;
  const nper = Math.log(pmt / (pmt - rate * pv)) / Math.log(1 + rate);
  return Math.ceil(Math.abs(nper));
}

function generateAmortizationTable(loan) {
  const table = [];
  let balance = loan.outstanding_balance;
  const rate = loan.interest_rate / 100;
  const monthlyPayment = loan.monthly_payment;
  
  for (let i = 1; i <= Math.min(12, loan.remaining_installments); i++) {
    const interest = balance * rate;
    const amortization = monthlyPayment - interest;
    balance -= amortization;
    
    table.push({
      installment: i,
      payment: monthlyPayment,
      interest,
      amortization,
      balance: Math.max(0, balance)
    });
  }
  
  return table;
}

module.exports = loanController;