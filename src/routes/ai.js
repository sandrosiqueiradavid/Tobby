const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

async function getGroqReply(message, context, useFinancialData) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  let systemPrompt = `Você é o Tobby IA, um assistente financeiro amigável do aplicativo Tobby. Você tem personalidade de um cachorro chamado Tobby: leal, animado e sempre pronto para ajudar.

REGRAS IMPORTANTES:
1. Responda SEMPRE em português brasileiro
2. Use emojis moderadamente (🐶, 💰, 📊, ✅, ⚠️, 📈)
3. Seja prático, acolhedor e dê conselhos realistas
4. Responda APENAS o que o usuário perguntou, sem invadir a privacidade
5. NÃO ofereça análises financeiras não solicitadas

Pergunta do usuário: ${message}`;

  if (useFinancialData) {
    const salary = context?.salary || 0;
    const billsCount = context?.billsCount || 0;
    const pendingBills = context?.pendingBills || 0;
    const lateBills = context?.lateBills || 0;
    const totalCommitted = context?.totalCommitted || 0;
    const commitmentPercent = context?.commitmentPercent || 0;
    const freeMoney = context?.freeMoney || 0;

    systemPrompt = `Você é o Tobby IA, um assistente financeiro especialista do aplicativo Tobby.

DADOS REAIS DO USUARIO:
- Salario mensal: R$ ${salary.toLocaleString('pt-BR')}
- Total de contas: ${billsCount}
- Contas pendentes: ${pendingBills}
- Contas atrasadas: ${lateBills}
- Total de gastos: R$ ${totalCommitted.toLocaleString('pt-BR')}
- Comprometimento: ${commitmentPercent}%
- Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

REGRAS:
1. Responda em portugues brasileiro
2. Use emojis com moderação
3. Seja acolhedor e pratico
4. Use OS DADOS REAIS acima para dar uma resposta personalizada

Pergunta do usuario: ${message}`;
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 800
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Erro Groq:', data);
    throw new Error(data.error?.message || 'Erro na API Groq');
  }
  
  return data.choices[0].message.content;
}

function getFallbackReply(message, useFinancialData, context) {
  const msg = message.toLowerCase();
  const analiseKeywords = ['analise', 'análise', 'finanças', 'contas', 'salário', 'gastos'];
  const querAnalise = analiseKeywords.some(keyword => msg.includes(keyword));
  
  if (!querAnalise) {
    if (msg.includes('oi') || msg.includes('olá')) {
      return `🐶 Oi! Sou o Tobby, seu assistente financeiro. Como posso ajudar?`;
    }
    if (msg.includes('obrigado')) {
      return `🐶 Por nada! Estou sempre aqui quando precisar! 🐾`;
    }
    return `🐶 Olá! Sou o Tobby. Se quiser uma análise das suas finanças, é só pedir "analise minhas finanças"!`;
  }
  
  const salary = context?.salary || 0;
  const billsCount = context?.billsCount || 0;
  const pendingBills = context?.pendingBills || 0;
  const lateBills = context?.lateBills || 0;
  const commitmentPercent = context?.commitmentPercent || 0;
  const freeMoney = context?.freeMoney || salary;

  if (lateBills > 0) {
    return `🐶 ANALISE FINANCEIRA

⚠️ Você tem ${lateBills} conta(s) atrasada(s)!

📊 SEUS NUMEROS:
• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas atrasadas: ${lateBills}
• Comprometimento: ${commitmentPercent}%
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

🎯 RECOMENDACOES:
1. Pague as contas atrasadas o mais rápido possível
2. Negocie multas com os credores
3. Corte gastos não essenciais por 30 dias`;
  }
  
  if (billsCount === 0) {
    return `🐶 VOCE AINDA NAO TEM CONTAS CADASTRADAS

• Salário: R$ ${salary.toLocaleString('pt-BR')}

Cadastre suas contas na aba "Contas" do aplicativo para eu poder analisar suas finanças!`;
  }
  
  return `🐶 RESUMO FINANCEIRO

📊 SEUS NUMEROS:
• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas cadastradas: ${billsCount}
• Pendentes: ${pendingBills}
• Atrasadas: ${lateBills}
• Comprometimento: ${commitmentPercent}%
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

${commitmentPercent <= 50 ? '✅ Sua situação financeira está saudável!' : (commitmentPercent <= 70 ? '⚠️ Atenção: Seu comprometimento está alto!' : '🔴 Alerta: Risco financeiro detectado!')}`;
}

// ===== CHAT NORMAL =====
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const msgLower = message.toLowerCase();
    const analiseKeywords = ['analise', 'análise', 'finanças', 'minhas contas', 'meu salário', 'meus gastos'];
    const useFinancialData = analiseKeywords.some(keyword => msgLower.includes(keyword));
    
    if (!GROQ_API_KEY || GROQ_API_KEY === '12345') {
      return res.json({ reply: getFallbackReply(message, useFinancialData, context) });
    }
    
    const reply = await getGroqReply(message, context, useFinancialData);
    res.json({ reply });
  } catch (error) {
    console.error('Erro no chat:', error);
    const reply = getFallbackReply(req.body.message, false, req.body.context);
    res.json({ reply });
  }
});

// ===== ANÁLISE FINANCEIRA PROFUNDA =====
router.post('/analyze', async (req, res) => {
  try {
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
      value: decryptNumber(b.value_encrypted)
    }));
    
    const totalExpenses = billsWithValues.reduce((sum, b) => sum + b.value, 0);
    const paidExpenses = billsWithValues.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.value, 0);
    const lateExpenses = billsWithValues.filter(b => b.status === 'late').reduce((sum, b) => sum + b.value, 0);
    
    const expensesByCategory = {};
    billsWithValues.forEach(b => {
      const cat = b.category || 'outros';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + b.value;
    });
    
    const sortedCategories = Object.entries(expensesByCategory).sort((a,b) => b[1] - a[1]);
    const mainCategory = sortedCategories[0];
    
    const { data: goals } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', req.userId)
      .eq('status', 'active');
    
    const { data: scoreData } = await supabase
      .from('financial_score')
      .select('score')
      .eq('user_id', req.userId)
      .single();
    
    const { data: emergencyFund } = await supabase
      .from('emergency_fund')
      .select('current_amount')
      .eq('user_id', req.userId)
      .single();
    
    const savingsRate = salary > 0 ? ((salary - totalExpenses) / salary) * 100 : 0;
    
    let analysis = `
<strong>🐶 ANALISE FINANCEIRA</strong><br><br>

<strong>📊 SEUS NUMEROS:</strong><br>
• Salário: <strong>R$ ${salary.toLocaleString('pt-BR')}</strong><br>
• Total de gastos: R$ ${totalExpenses.toLocaleString('pt-BR')}<br>
• Já pago: R$ ${paidExpenses.toLocaleString('pt-BR')}<br>
• Atrasado: <strong style="color: #EF4444;">R$ ${lateExpenses.toLocaleString('pt-BR')}</strong><br>
• Taxa de economia: <strong>${savingsRate.toFixed(1)}%</strong><br>
• Score Tobby: <strong>${scoreData?.score || 0}/100</strong><br><br>

<strong>📈 DISTRIBUICAO DOS GASTOS:</strong><br>
${sortedCategories.slice(0, 5).map(([cat, val]) => `• ${cat}: R$ ${val.toLocaleString('pt-BR')} (${((val / totalExpenses) * 100).toFixed(0)}%)`).join('<br>')}<br><br>

<strong>🎯 METAS ATIVAS:</strong><br>
${goals && goals.length > 0 ? goals.map(g => `• ${g.name}: ${((g.current_amount / g.target_amount) * 100).toFixed(0)}% concluído`).join('<br>') : '• Nenhuma meta ativa'}<br><br>

<strong>💰 RESERVA:</strong><br>
• Reserva de emergência: R$ ${(emergencyFund?.current_amount || 0).toLocaleString('pt-BR')}<br><br>

<strong>💡 INSIGHTS:</strong><br>
`;
    
    if (lateExpenses > 0) {
      analysis += `⚠️ <strong>ALERTA:</strong> Você tem R$ ${lateExpenses.toLocaleString('pt-BR')} em contas atrasadas.<br>`;
    }
    if (savingsRate < 20 && salary > 0) {
      analysis += `💰 Sua taxa de economia está abaixo do ideal (20%).<br>`;
    } else if (savingsRate >= 20) {
      analysis += `💰 Parabens! Você está economizando ${savingsRate.toFixed(0)}% da sua renda! 🎉<br>`;
    }
    if (mainCategory && mainCategory[1] > totalExpenses * 0.3) {
      analysis += `📌 Seus gastos com "${mainCategory[0]}" representam ${((mainCategory[1] / totalExpenses) * 100).toFixed(0)}% do total.<br>`;
    }
    
    res.json({ analysis });
  } catch (error) {
    console.error('Erro na análise:', error);
    res.status(500).json({ analysis: '🐶 Desculpe, não consegui gerar a análise no momento.' });
  }
});

// ===== REVISÃO MENSAL =====
router.post('/monthly-review', async (req, res) => {
  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const { data: previousScore } = await supabase
      .from('financial_timeline')
      .select('score')
      .eq('user_id', req.userId)
      .eq('event_type', 'score_change')
      .order('event_date', { ascending: false })
      .limit(1);
    
    const { data: currentScore } = await supabase
      .from('financial_score')
      .select('score')
      .eq('user_id', req.userId)
      .single();
    
    const scoreChange = (currentScore?.score || 0) - (previousScore?.[0]?.score || 0);
    
    const review = `
🐶 **REVISÃO MENSAL - ${lastMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}**

📊 **EVOLUÇÃO:**
• Score anterior: ${previousScore?.[0]?.score || '--'}
• Score atual: ${currentScore?.score || '--'}
• Variação: ${scoreChange > 0 ? '+' : ''}${scoreChange}

🎯 **PRÓXIMOS PASSOS:**
${currentScore?.score >= 70 ? 'Continue com o bom trabalho! 🎉' : 'Foque em reduzir gastos e aumentar sua reserva de emergência.'}

🐶 Tobby
    `;
    
    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar revisão mensal' });
  }
});

// ===== INSIGHTS DIÁRIOS =====
router.post('/daily-insights', async (req, res) => {
  try {
    const { data: bills } = await supabase
      .from('bills')
      .select('value_encrypted, status, due_day')
      .eq('user_id', req.userId)
      .eq('status', 'pending');
    
    const today = new Date().getDate();
    const upcomingBills = (bills || []).filter(b => b.due_day >= today && b.due_day <= today + 3);
    const upcomingTotal = upcomingBills.reduce((sum, b) => sum + decryptNumber(b.value_encrypted), 0);
    
    let insight = '';
    if (upcomingBills.length > 0) {
      insight = `🐶 **INSIGHT DO DIA**\n\nVocê tem ${upcomingBills.length} conta(s) a vencer nos próximos 3 dias, totalizando R$ ${upcomingTotal.toLocaleString('pt-BR')}. Programe-se!`;
    } else {
      insight = `🐶 **INSIGHT DO DIA**\n\nNenhuma conta a vencer nos próximos dias. Que tal adiantar uma meta ou investir um pouco hoje?`;
    }
    
    res.json({ insight });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar insight diário' });
  }
});

module.exports = router;