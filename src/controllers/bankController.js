// src/controllers/bankController.js
const supabase = require('../db/supabase');
const { encryptNumber } = require('../services/encryptionService');

const bankController = {
  processBankExtract: async (req, res) => {
    try {
      const { extractText, format } = req.body;
      if (!extractText) {
        return res.status(400).json({ error: 'Texto do extrato é obrigatório' });
      }

      let transactions = [];
      
      if (format === 'csv') {
        transactions = parseCSV(extractText);
      } else if (format === 'ofx') {
        transactions = parseOFX(extractText);
      } else {
        transactions = parseTextExtract(extractText);
      }

      const expenses = transactions.filter(t => t.type === 'expense' && t.value > 0);
      
      const bills = [];
      for (const exp of expenses.slice(0, 20)) {
        const encryptedValue = encryptNumber(exp.value);
        
        const { data: bill, error } = await supabase
          .from('bills')
          .insert({
            user_id: req.userId,
            name: exp.name,
            value_encrypted: encryptedValue,
            due_day: new Date().getDate(),
            category: exp.category || 'outros',
            status: 'paid'
          })
          .select()
          .single();
        
        if (!error && bill) bills.push(bill);
      }

      res.json({
        success: true,
        message: `${bills.length} despesas identificadas e cadastradas`,
        bills: bills,
        summary: {
          totalTransactions: transactions.length,
          expensesCount: expenses.length,
          incomeCount: transactions.filter(t => t.type === 'income').length,
          totalExpensesValue: expenses.reduce((sum, e) => sum + e.value, 0)
        }
      });
    } catch (err) {
      console.error('Bank extract error:', err);
      res.status(500).json({ error: 'Erro ao processar extrato' });
    }
  }
};

function parseTextExtract(text) {
  const lines = text.split('\n');
  const transactions = [];
  const patterns = [
    { regex: /pag[ue]?[sS]?[tT]?[oO]?\s*[Rr]\$\s*([\d.,]+)/i, name: 'Pagamento', category: 'outros' },
    { regex: /compr[ae]?\s*[Rr]\$\s*([\d.,]+)/i, name: 'Compra', category: 'outros' },
    { regex: /deb[ií]to\s*[Rr]\$\s*([\d.,]+)/i, name: 'Débito', category: 'outros' },
    { regex: /supermercado.*[Rr]\$\s*([\d.,]+)/i, name: 'Supermercado', category: 'alimentacao' },
    { regex: /restaurante.*[Rr]\$\s*([\d.,]+)/i, name: 'Restaurante', category: 'alimentacao' },
    { regex: /uber.*[Rr]\$\s*([\d.,]+)/i, name: 'Uber', category: 'transporte' },
    { regex: /netflix.*[Rr]\$\s*([\d.,]+)/i, name: 'Netflix', category: 'lazer' },
    { regex: /salario.*[Rr]\$\s*([\d.,]+)/i, name: 'Salário', category: 'receita', type: 'income' }
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const value = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        transactions.push({
          name: pattern.name,
          value: value,
          type: pattern.type === 'income' ? 'income' : 'expense',
          category: pattern.category,
          date: new Date()
        });
        break;
      }
    }
  }
  
  return transactions;
}

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const transactions = [];
  
  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    if (parts.length >= 3) {
      const value = parseFloat(parts[2].replace(/["']/g, '').trim());
      if (!isNaN(value) && value > 0) {
        const isExpense = parts[1]?.includes('DEBITO') || parts[1]?.includes('PAG');
        transactions.push({
          name: parts[1]?.replace(/["']/g, '') || 'Transação',
          value: value,
          type: isExpense ? 'expense' : 'income',
          category: 'outros',
          date: new Date(parts[0])
        });
      }
    }
  }
  
  return transactions;
}

function parseOFX(ofxText) {
  const transactions = [];
  const matches = ofxText.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g) || [];
  
  for (const match of matches) {
    const nameMatch = match.match(/<NAME>([^<]+)/);
    const amountMatch = match.match(/<TRNAMT>([^<]+)/);
    const typeMatch = match.match(/<TRNTYPE>([^<]+)/);
    
    if (amountMatch) {
      const value = Math.abs(parseFloat(amountMatch[1]));
      const type = typeMatch && (typeMatch[1] === 'DEBIT' || typeMatch[1] === 'PAYMENT') ? 'expense' : 'income';
      
      if (type === 'expense') {
        transactions.push({
          name: nameMatch ? nameMatch[1].trim() : 'Transação bancária',
          value: value,
          type: type,
          category: 'outros',
          date: new Date()
        });
      }
    }
  }
  
  return transactions;
}

module.exports = bankController;