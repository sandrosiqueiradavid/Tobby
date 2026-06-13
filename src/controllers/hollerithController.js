const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');

// Mantenha as funções parseHollerith, calculateINSS, calculateIRRF iguais

const hollerithController = {
  // ... processHollerith (sem alterações significativas)

  generateIncomeReport: async (req, res) => {
    try {
      const { year } = req.query;
      const currentYear = year || new Date().getFullYear();

      const { data: user } = await supabase
        .from('tobby_users')
        .select('name, salary_encrypted')
        .eq('id', req.userId)
        .single();

      const { data: paidBills } = await supabase
        .from('tobby_bills')
        .select('value_encrypted')
        .eq('user_id', req.userId)
        .eq('status', 'paid');

      const monthlyIncome = decryptNumber(user?.salary_encrypted) || 0;
      const totalIncome = monthlyIncome * 12;
      const totalExpenses = paidBills ? paidBills.reduce((sum, b) => sum + decryptNumber(b.value_encrypted), 0) : 0;
      const inss = calculateINSS(monthlyIncome);
      const irrf = calculateIRRF(monthlyIncome);
      const annualINSS = inss * 12;
      const annualIRRF = irrf * 12;
      const netIncome = (monthlyIncome - inss - irrf) * 12;

      res.json({
        user: user?.name || 'Usuário',
        year: currentYear,
        monthlyIncome,
        totalIncome,
        totalExpenses,
        annualINSS,
        annualIRRF,
        netIncome,
        taxSavings: totalExpenses > 0 ? Math.min(totalExpenses * 0.3, annualIRRF) : 0,
        deductibleExpenses: totalExpenses
      });
    } catch (err) {
      console.error('Income report error:', err);
      res.status(500).json({ error: 'Erro ao gerar informe' });
    }
  },

  generateIRDeclaration: async (req, res) => {
    try {
      const { year } = req.query;
      const currentYear = year || new Date().getFullYear();

      const { data: user } = await supabase
        .from('tobby_users')
        .select('name, email, salary_encrypted')
        .eq('id', req.userId)
        .single();

      const monthlySalary = decryptNumber(user?.salary_encrypted) || 0;
      const annualIncome = monthlySalary * 12;
      const inss = calculateINSS(monthlySalary);
      const irrf = calculateIRRF(monthlySalary);
      const annualINSS = inss * 12;
      const annualIRRF = irrf * 12;

      const { data: bills } = await supabase
        .from('tobby_bills')
        .select('value_encrypted')
        .eq('user_id', req.userId)
        .eq('status', 'paid');

      const deductibleExpenses = bills ? bills.reduce((sum, b) => sum + decryptNumber(b.value_encrypted), 0) : 0;
      const taxBase = annualIncome - annualINSS - Math.min(deductibleExpenses * 0.3, annualIRRF);

      let taxDue = 0;
      if (taxBase > 0) {
        if (taxBase <= 22847.76) taxDue = 0;
        else if (taxBase <= 33919.80) taxDue = taxBase * 0.075 - 1713.58;
        else if (taxBase <= 45012.60) taxDue = taxBase * 0.15 - 4257.57;
        else if (taxBase <= 55976.16) taxDue = taxBase * 0.225 - 7633.51;
        else taxDue = taxBase * 0.275 - 10432.32;
      }

      res.json({
        year: currentYear,
        taxpayer: { name: user?.name || 'Usuário', email: user?.email || '' },
        annualIncome,
        annualINSS,
        annualIRRF,
        deductibleExpenses,
        taxBase,
        taxDue: Math.max(0, taxDue),
        status: taxDue <= annualIRRF ? 'Com restituição' : 'Saldo a pagar',
        estimatedRefund: Math.max(0, annualIRRF - taxDue),
        estimatedPayment: Math.max(0, taxDue - annualIRRF)
      });
    } catch (err) {
      console.error('IR declaration error:', err);
      res.status(500).json({ error: 'Erro ao gerar declaração' });
    }
  }
};

// Mantenha as funções auxiliares parseHollerith, calculateINSS, calculateIRRF iguais

module.exports = hollerithController;