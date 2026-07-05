// src/controllers/hollerithController.js
const supabase = require('../db/supabase');
const { encryptNumber, decryptNumber } = require('../services/encryptionService');

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
    { regex: /FGTS.*R\$\s*([\d.,]+)/i, name: 'FGTS', category: 'impostos', due_day: 20 },
    // Padrões adicionais
    { regex: /SAL.*LIQUIDO.*R\$\s*([\d.,]+)/i, name: 'Salário Líquido', category: 'receita', due_day: 5 },
    { regex: /BÔNUS.*R\$\s*([\d.,]+)/i, name: 'Bônus', category: 'receita', due_day: 5 },
    { regex: /COMISSÃO.*R\$\s*([\d.,]+)/i, name: 'Comissão', category: 'receita', due_day: 5 },
    { regex: /HORA.*EXTRA.*R\$\s*([\d.,]+)/i, name: 'Hora Extra', category: 'receita', due_day: 5 },
    { regex: /DESCONTO.*R\$\s*([\d.,]+)/i, name: 'Desconto', category: 'outros', due_day: 20 }
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

const hollerithController = {
  // ===== PROCESSAR HOLERITE =====
  async processHollerith(req, res) {
    try {
      const { hollerithText } = req.body;
      
      if (!hollerithText) {
        return res.status(400).json({ error: 'Texto do holerite é obrigatório' });
      }

      console.log('[HOLLERITH] 📄 Processando holerite para usuário:', req.userId);

      const parsedData = parseHollerith(hollerithText);
      
      if (!parsedData.success) {
        return res.status(400).json({ error: parsedData.error });
      }

      const bills = [];
      let totalSaved = 0;

      for (const item of parsedData.bills) {
        // Verificar se já existe uma conta similar para evitar duplicatas
        const { data: existing } = await supabase
          .from('bills')
          .select('id')
          .eq('user_id', req.userId)
          .eq('name', item.name)
          .eq('status', 'pending')
          .maybeSingle();

        if (existing) {
          console.log(`[HOLLERITH] ⏭️ Conta "${item.name}" já existe, pulando...`);
          continue;
        }

        const encryptedValue = encryptNumber(item.value);
        
        const { data: bill, error } = await supabase
          .from('bills')
          .insert({
            user_id: req.userId,
            name: item.name,
            value_encrypted: encryptedValue,
            value: item.value,
            due_day: item.due_day,
            category: item.category,
            status: 'pending'
          })
          .select()
          .single();
        
        if (!error && bill) {
          bills.push({ ...bill, value: item.value });
          totalSaved += item.value;
        }
      }

      // Atualizar salário do usuário se encontrado
      if (parsedData.summary.totalGross > 0) {
        const encryptedSalary = encryptNumber(parsedData.summary.totalGross);
        await supabase
          .from('users')
          .update({ 
            salary_encrypted: encryptedSalary,
            salary: parsedData.summary.totalGross,
            updated_at: new Date()
          })
          .eq('id', req.userId);
      }

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'HOLLERITH_PROCESSED',
          table_name: 'bills',
          new_value: { 
            bills_added: bills.length,
            total_value: totalSaved,
            gross_salary: parsedData.summary.totalGross,
            net_salary: parsedData.summary.totalNet
          }
        });

      console.log(`[HOLLERITH] ✅ ${bills.length} contas adicionadas, total R$ ${totalSaved.toFixed(2)}`);

      res.json({
        success: true,
        message: `${bills.length} contas identificadas e cadastradas`,
        bills: bills,
        summary: parsedData.summary,
        salary_updated: parsedData.summary.totalGross > 0
      });
    } catch (err) {
      console.error('[HOLLERITH] ❌ Erro:', err);
      res.status(500).json({ error: 'Erro ao processar holerite: ' + err.message });
    }
  },

  // ===== GERAR INFORME DE RENDIMENTOS =====
  async generateIncomeReport(req, res) {
    try {
      const { year } = req.query;
      const currentYear = year || new Date().getFullYear();

      console.log('[HOLLERITH] 📊 Gerando informe de rendimentos para:', req.userId);

      const { data: user } = await supabase
        .from('users')
        .select('name, salary_encrypted')
        .eq('id', req.userId)
        .single();

      const { data: paidBills } = await supabase
        .from('bills')
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

      // Calcular percentual de dedução
      const deductionPercent = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

      res.json({
        success: true,
        data: {
          user: user?.name || 'Usuário',
          year: currentYear,
          monthlyIncome,
          totalIncome,
          totalExpenses,
          annualINSS,
          annualIRRF,
          netIncome,
          taxSavings: totalExpenses > 0 ? Math.min(totalExpenses * 0.3, annualIRRF) : 0,
          deductibleExpenses: totalExpenses,
          deductionPercent: deductionPercent.toFixed(1),
          status: deductionPercent > 30 ? 'Ótimo! Você tem muitas despesas dedutíveis' : 'Considere aumentar suas despesas dedutíveis'
        }
      });
    } catch (err) {
      console.error('[HOLLERITH] ❌ Erro no informe:', err);
      res.status(500).json({ error: 'Erro ao gerar informe: ' + err.message });
    }
  },

  // ===== GERAR DECLARAÇÃO DE IR =====
  async generateIRDeclaration(req, res) {
    try {
      const { year } = req.query;
      const currentYear = year || new Date().getFullYear();

      console.log('[HOLLERITH] 📄 Gerando declaração de IR para:', req.userId);

      const { data: user } = await supabase
        .from('users')
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
        .from('bills')
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

      const taxDueFinal = Math.max(0, taxDue);
      const refund = Math.max(0, annualIRRF - taxDueFinal);
      const payment = Math.max(0, taxDueFinal - annualIRRF);

      // Classificação da situação
      let situation = 'Regular';
      let recommendation = 'Mantenha suas despesas organizadas.';
      
      if (refund > 0 && refund > annualIRRF * 0.3) {
        situation = 'Com restituição significativa';
        recommendation = 'Ótimo! Você tem direito a uma boa restituição. Verifique se todas as despesas estão declaradas.';
      } else if (refund > 0) {
        situation = 'Com restituição';
        recommendation = 'Você tem direito a restituição. Mantenha seus comprovantes organizados.';
      } else if (payment > 0 && payment < annualIRRF * 0.2) {
        situation = 'Saldo a pagar (baixo)';
        recommendation = 'Você tem um pequeno saldo a pagar. Planeje-se para quitar no prazo.';
      } else if (payment > 0) {
        situation = 'Saldo a pagar (significativo)';
        recommendation = 'Considere aumentar suas despesas dedutíveis para reduzir o imposto devido.';
      }

      res.json({
        success: true,
        data: {
          year: currentYear,
          taxpayer: { 
            name: user?.name || 'Usuário', 
            email: user?.email || '' 
          },
          annualIncome,
          annualINSS,
          annualIRRF,
          deductibleExpenses,
          taxBase: Math.max(0, taxBase),
          taxDue: taxDueFinal,
          situation,
          recommendation,
          estimatedRefund: refund,
          estimatedPayment: payment,
          status: taxDueFinal <= annualIRRF ? 'Com restituição' : 'Saldo a pagar'
        }
      });
    } catch (err) {
      console.error('[HOLLERITH] ❌ Erro na declaração IR:', err);
      res.status(500).json({ error: 'Erro ao gerar declaração: ' + err.message });
    }
  },

  // ===== RESUMO DO HOLERITE (OPCIONAL) =====
  async getSummary(req, res) {
    try {
      console.log('[HOLLERITH] 📋 Resumo do holerite para:', req.userId);

      const { data: user } = await supabase
        .from('users')
        .select('salary_encrypted')
        .eq('id', req.userId)
        .single();

      const salary = decryptNumber(user?.salary_encrypted) || 0;

      const { data: bills } = await supabase
        .from('bills')
        .select('value_encrypted, status, category')
        .eq('user_id', req.userId);

      const billsWithValues = (bills || []).map(b => ({
        ...b,
        value: decryptNumber(b.value_encrypted) || 0
      }));

      const totalBills = billsWithValues.reduce((s, b) => s + b.value, 0);
      const paidBills = billsWithValues.filter(b => b.status === 'paid').reduce((s, b) => s + b.value, 0);

      res.json({
        success: true,
        data: {
          salary,
          totalBills,
          paidBills,
          pendingBills: totalBills - paidBills,
          freeBalance: salary - paidBills,
          commitmentPercent: salary > 0 ? ((totalBills / salary) * 100).toFixed(1) : 0
        }
      });
    } catch (err) {
      console.error('[HOLLERITH] ❌ Erro no resumo:', err);
      res.status(500).json({ error: 'Erro ao gerar resumo: ' + err.message });
    }
  },

  // ===== PROCESSAMENTO AUTOMÁTICO COM IA (OPCIONAL) =====
  async autoProcess(req, res) {
    try {
      const { hollerithText } = req.body;
      
      if (!hollerithText) {
        return res.status(400).json({ error: 'Texto do holerite é obrigatório' });
      }

      // Usar a IA para extrair informações do holerite
      const aiService = require('../services/aiService');
      const analysis = await aiService.analyzeDocument(hollerithText, 'holerite');

      if (!analysis.success) {
        return res.status(400).json({ error: analysis.error || 'Erro na análise da IA' });
      }

      // Processar os dados extraídos pela IA
      const bills = [];
      for (const item of analysis.data.bills || []) {
        const encryptedValue = encryptNumber(item.value);
        const { data: bill } = await supabase
          .from('bills')
          .insert({
            user_id: req.userId,
            name: item.name,
            value_encrypted: encryptedValue,
            value: item.value,
            due_day: item.due_day || 5,
            category: item.category || 'outros',
            status: 'pending'
          })
          .select()
          .single();

        if (bill) bills.push(bill);
      }

      res.json({
        success: true,
        message: `${bills.length} contas identificadas pela IA`,
        bills,
        analysis: analysis.summary
      });
    } catch (err) {
      console.error('[HOLLERITH] ❌ Erro no auto-processamento:', err);
      res.status(500).json({ error: 'Erro no processamento automático: ' + err.message });
    }
  }
};

module.exports = hollerithController;