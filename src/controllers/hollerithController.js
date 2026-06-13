const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../utils/crypto');

// ===== FUNÇÕES AUXILIARES =====

function parseHollerith(text) {
  const lines = text.split('\n');
  const bills = [];
  let summary = { totalGross: 0, totalNet: 0, discounts: 0 };

  const patterns = [
    { regex: /SAL.*BASE.*R\$\s*([\d.,]+)/i, name: 'Salário Base', category: 'receita', due_day: 5 },
    { regex: /VALE.*TRANSPORTE.*R\$\s*([\d.,]+)/i, name: 'Vale Transporte', category: 'transporte', due_day: 5 },
    { regex: /VALE.*REFEIÇÃO.*R\$\s*([\d.,]+)/i, name: 'Vale Refeição', category: 'alimentacao', due_day: 5 },
    { regex: /PLANO.*SAÚDE.*R\$\s*([\d.,]+)/i, name: 'Plano de Saúde', category: 'saude', due_day: 5 },
    { regex: /INSS.*R\$\s*([\d.,]+)/i, name: 'INSS', category: 'impostos', due_day: 20 },
    { regex: /IRRF.*R\$\s*([\d.,]+)/i, name: 'IRRF', category: 'impostos', due_day: 20 },
    { regex: /FGTS.*R\$\s*([\d.,]+)/i, name: 'FGTS', category: 'impostos', due_day: 20 }
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const value = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        bills.push({
          name: pattern.name,
          value: value,
          due_day: pattern.due_day,
          category: pattern.category
        });
        
        if (pattern.category === 'receita') summary.totalGross += value;
        else summary.discounts += value;
        break;
      }
    }
  }

  summary.totalNet = summary.totalGross - summary.discounts;

  if (bills.length === 0) {
    return { success: false, error: 'Nenhum dado identificado no holerite' };
  }

  return { success: true, bills, summary };
}

function calculateINSS(salary) {
  if (salary <= 1412.00) return salary * 0.075;
  if (salary <= 2666.68) return salary * 0.09 - 21.18;
  if (salary <= 4000.03) return salary * 0.12 - 101.18;
  if (salary <= 7786.02) return salary * 0.14 - 181.18;
  return 854.52;
}

function calculateIRRF(salary) {
  const base = salary - calculateINSS(salary);
  if (base <= 2112.00) return 0;
  if (base <= 2826.65) return base * 0.075 - 158.40;
  if (base <= 3751.05) return base * 0.15 - 370.40;
  if (base <= 4664.68) return base * 0.225 - 651.73;
  return base * 0.275 - 884.96;
}

// ===== CONTROLLER PRINCIPAL =====

const hollerithController = {
  // Processar texto do holerite e criar contas automaticamente
  processHollerith: async (req, res) => {
    try {
      const { hollerithText } = req.body;
      if (!hollerithText) {
        return res.status(400).json({ error: 'Texto do holerite é obrigatório' });
      }

      const parsedData = parseHollerith(hollerithText);
      if (!parsedData.success) {
        return res.status(400).json({ error: parsedData.error });
      }

      const bills = [];
      for (const item of parsedData.bills) {
        const encryptedValue = encryptNumber(item.value);
        
        const { data: bill, error } = await supabase
          .from('tobby_bills')
          .insert({
            user_id: req.userId,
            name: item.name,
            value_encrypted: encryptedValue,
            due_day: item.due_day,
            category: item.category,
            status: 'pending'
          })
          .select()
          .single();
        
        if (!error && bill) {
          bills.push({ ...bill, value: item.value });
        }
      }

      res.json({
        success: true,
        message: `${bills.length} contas identificadas e cadastradas`,
        bills: bills,
        summary: parsedData.summary
      });
    } catch (err) {
      console.error('Hollerith error:', err);
      res.status(500).json({ error: 'Erro ao processar holerite: ' + err.message });
    }
  },

  // Gerar informe de rendimentos anual
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

  // Gerar declaração de IR simplificada
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

module.exports = hollerithController;