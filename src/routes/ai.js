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
6. NÃO mencione salário, contas ou dados financeiros a menos que o usuário peça explicitamente

Pergunta do usuário: ${message}`;

  // SÓ usa os dados financeiros se o usuário PEDIR explicitamente
  if (useFinancialData) {
    const salary = context?.salary || 0;
    const billsCount = context?.billsCount || 0;
    const pendingBills = context?.pendingBills || 0;
    const lateBills = context?.lateBills || 0;
    const totalCommitted = context?.totalCommitted || 0;
    const commitmentPercent = context?.commitmentPercent || 0;
    const freeMoney = context?.freeMoney || 0;

    systemPrompt = `Você é o Tobby IA, um assistente financeiro especialista do aplicativo Tobby.

DADOS REAIS DO USUARIO (use SOMENTE se ele pediu análise financeira):
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
5. Dê sugestões específicas baseadas no cenário do usuario

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
  
  const analiseKeywords = ['analise', 'análise', 'finanças', 'contas', 'salário', 'gastos', 'despesas', 'economizar', 'investir', 'divida', 'dívida'];
  
  const querAnalise = analiseKeywords.some(keyword => msg.includes(keyword));
  
  if (!querAnalise) {
    if (msg.includes('oi') || msg.includes('olá') || msg.includes('ola')) {
      return `🐶 Oi! Tudo bem? Sou o Tobby, seu assistente financeiro. Como posso ajudar você hoje?`;
    }
    if (msg.includes('obrigado') || msg.includes('valeu')) {
      return `🐶 Por nada! Fico feliz em ajudar. Estou sempre aqui quando precisar! 🐾`;
    }
    if (msg.includes('tudo bem') || msg.includes('como você está')) {
      return `🐶 Estou muito bem, obrigado por perguntar! E você, como está? Como posso ajudar hoje?`;
    }
    if (msg.includes('quem é você') || msg.includes('quem e voce')) {
      return `🐶 Sou o Tobby! Seu assistente financeiro pessoal. Ajudo você a organizar suas contas, dar dicas de economia e responder perguntas sobre finanças. Que tal me perguntar algo sobre investimentos ou como economizar?`;
    }
    if (msg.includes('ajuda') || msg.includes('help') || msg.includes('comandos')) {
      return `🐶 Aqui estão algumas coisas que posso fazer:

• "Analise minhas finanças" - diagnóstico completo
• "Como economizar?" - dicas personalizadas
• "Dicas de investimentos" - guia para iniciantes
• "Como sair das dívidas" - plano de ação
• Perguntas gerais sobre finanças, economia, investimentos

O que você gostaria de saber hoje? 🐶`;
    }
    
    return `🐶 Olá! Sou o Tobby, seu assistente financeiro. Posso ajudar com dicas de economia, investimentos ou responder perguntas sobre finanças. Se quiser uma análise das suas finanças, é só pedir: "analise minhas finanças"! O que você precisa?`;
  }
  
  const salary = context?.salary || 0;
  const billsCount = context?.billsCount || 0;
  const pendingBills = context?.pendingBills || 0;
  const lateBills = context?.lateBills || 0;
  const totalCommitted = context?.totalCommitted || 0;
  const commitmentPercent = context?.commitmentPercent || 0;
  const freeMoney = context?.freeMoney || salary;

  if (msg.includes('analise') || msg.includes('análise') || msg.includes('finanças')) {
    if (lateBills > 0) {
      return `🐶 ANALISE FINANCEIRA

⚠️ Você tem ${lateBills} conta(s) atrasada(s)!

📊 SEUS NUMEROS:
• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas atrasadas: ${lateBills}
• Contas pendentes: ${pendingBills}
• Comprometimento: ${commitmentPercent}%
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

🎯 RECOMENDACOES:
1. Pague as contas atrasadas o mais rápido possível
2. Negocie multas com os credores
3. Corte gastos não essenciais por 30 dias

Precisa de ajuda para priorizar as contas? 🐶`;
    }
    
    if (billsCount === 0) {
      return `🐶 VOCE AINDA NAO TEM CONTAS CADASTRADAS

• Salário: R$ ${salary.toLocaleString('pt-BR')}

Para eu poder analisar suas finanças, cadastre suas contas na aba "Contas" do aplicativo. Assim posso te dar um diagnóstico completo!

Vamos começar? 🐶`;
    }
    
    return `🐶 RESUMO FINANCEIRO

📊 SEUS NUMEROS:
• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas cadastradas: ${billsCount}
• Pendentes: ${pendingBills}
• Atrasadas: ${lateBills}
• Comprometimento: ${commitmentPercent}%
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

${commitmentPercent <= 50 ? '✅ Sua situação financeira está saudável!' : (commitmentPercent <= 70 ? '⚠️ Atenção: Seu comprometimento está alto!' : '🔴 Alerta: Risco financeiro detectado!')}

Como posso ajudar a melhorar? 🐶`;
  }
  
  if (msg.includes('investir') || msg.includes('investimento')) {
    return `🐶 DICAS DE INVESTIMENTOS

💰 Com seu perfil (saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}/mes)

📊 POR ONDE COMECAR:
1. Tesouro Selic (seguro e liquido)
2. CDB 100% CDI (protegido pelo FGC)
3. LCI/LCA (isentos de IR)

Quer saber mais sobre alguma dessas opções? 🐶`;
  }
  
  if (msg.includes('economizar') || msg.includes('poupar')) {
    return `🐶 DICAS PARA ECONOMIZAR

📋 PLANO PRATICO:
1. Liste todos os gastos (use o Tobby!)
2. Corte assinaturas que não usa
3. Cozinhe mais em casa
4. Use transporte público quando possivel

💰 Potencial de economia: 20-30% dos gastos atuais!

Quer ajuda para identificar onde cortar? 🐶`;
  }
  
  return `🐶 Entendi sua pergunta! Para te dar a melhor resposta, você poderia me dar mais detalhes? Ou se quiser uma análise completa das suas finanças, é só pedir "analise minhas finanças"! 🐾`;
}

// ===== NOVO: IA ANALISTA FINANCEIRA =====
router.post('/analyze', async (req, res) => {
  try {
    const { period = 'month' } = req.body;
    
    // Buscar dados para análise
    const { data: user } = await supabase
      .from('users')
      .select('salary_encrypted')
      .eq('id', req.userId)
      .single();
    
    const salary = decryptNumber(user?.salary_encrypted) || 0;
    
    // Buscar contas
    const { data: bills } = await supabase
      .from('bills')
      .select('value_encrypted, status, category, created_at')
      .eq('user_id', req.userId);
    
    const billsWithValues = (bills || []).map(b => ({
      ...b,
      value: decryptNumber(b.value_encrypted)
    }));
    
    const totalExpenses = billsWithValues.reduce((sum, b) => sum + b.value, 0);
    const paidExpenses = billsWithValues
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.value, 0);
    const pendingExpenses = billsWithValues
      .filter(b => b.status === 'pending')
      .reduce((sum, b) => sum + b.value, 0);
    const lateExpenses = billsWithValues
      .filter(b => b.status === 'late')
      .reduce((sum, b) => sum + b.value, 0);
    
    // Gastos por categoria
    const expensesByCategory = {};
    billsWithValues.forEach(b => {
      const cat = b.category || 'outros';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + b.value;
    });
    
    const sortedCategories = Object.entries(expensesByCategory).sort((a,b) => b[1] - a[1]);
    const mainCategory = sortedCategories[0];
    
    // Buscar metas
    const { data: goals } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', req.userId)
      .eq('status', 'active');
    
    // Buscar score
    const { data: scoreData } = await supabase
      .from('financial_score')
      .select('score')
      .eq('user_id', req.userId)
      .single();
    
    // Buscar reserva
    const { data: emergencyFund } = await supabase
      .from('emergency_fund')
      .select('current_amount')
      .eq('user_id', req.userId)
      .single();
    
    // Buscar investimentos
    const { data: investments } = await supabase
      .from('investments')
      .select('quantity, purchase_price_encrypted, current_price_encrypted')
      .eq('user_id', req.userId);
    
    const totalInvestments = (investments || []).reduce((sum, inv) => {
      const price = decryptNumber(inv.current_price_encrypted) || decryptNumber(inv.purchase_price_encrypted) || 0;
      return sum + (inv.quantity * price);
    }, 0);
    
    // Calcular taxa de economia
    const savingsRate = salary > 0 ? ((salary - totalExpenses) / salary) * 100 : 0;
    
    // Gerar análise em HTML formatado
    let analysis = `
<strong>🐶 ANALISE FINANCEIRA - ${period.toUpperCase()}</strong><br><br>

<strong>📊 SEUS NUMEROS:</strong><br>
• Salário: <strong>R$ ${salary.toLocaleString('pt-BR')}</strong><br>
• Total de gastos: R$ ${totalExpenses.toLocaleString('pt-BR')}<br>
• Já pago: R$ ${paidExpenses.toLocaleString('pt-BR')}<br>
• Pendente: R$ ${pendingExpenses.toLocaleString('pt-BR')}<br>
• Atrasado: <strong style="color: #EF4444;">R$ ${lateExpenses.toLocaleString('pt-BR')}</strong><br>
• Taxa de economia: <strong>${savingsRate.toFixed(1)}%</strong><br>
• Score Tobby: <strong>${scoreData?.score || 0}/100</strong><br><br>

<strong>📈 DISTRIBUICAO DOS GASTOS:</strong><br>
${sortedCategories.slice(0, 5).map(([cat, val]) => `• ${cat}: R$ ${val.toLocaleString('pt-BR')} (${((val / totalExpenses) * 100).toFixed(0)}%)`).join('<br>')}<br><br>

<strong>🎯 METAS ATIVAS:</strong><br>
${goals && goals.length > 0 ? goals.map(g => `• ${g.name}: ${((g.current_amount / g.target_amount) * 100).toFixed(0)}% concluído`).join('<br>') : '• Nenhuma meta ativa'}<br><br>

<strong>💰 PATRIMONIO E RESERVA:</strong><br>
• Reserva de emergência: R$ ${(emergencyFund?.current_amount || 0).toLocaleString('pt-BR')}<br>
• Investimentos: R$ ${totalInvestments.toLocaleString('pt-BR')}<br><br>

<strong>💡 INSIGHTS E RECOMENDACOES:</strong><br>
`;

    // Insights baseados nos dados
    if (lateExpenses > 0) {
      analysis += `⚠️ <strong>ALERTA:</strong> Você tem R$ ${lateExpenses.toLocaleString('pt-BR')} em contas atrasadas. Priorize o pagamento!<br>`;
    }
    
    if (savingsRate < 20 && salary > 0) {
      analysis += `💰 Sua taxa de economia está abaixo do ideal (20%). Tente reduzir gastos supérfluos.<br>`;
    } else if (savingsRate >= 20) {
      analysis += `💰 Parabens! Você está economizando ${savingsRate.toFixed(0)}% da sua renda. Continue assim! 🎉<br>`;
    }
    
    if (mainCategory && mainCategory[1] > totalExpenses * 0.3) {
      analysis += `📌 Seus gastos com "${mainCategory[0]}" representam ${((mainCategory[1] / totalExpenses) * 100).toFixed(0)}% do total. Vale a pena revisar!<br>`;
    }
    
    if (emergencyFund?.current_amount < totalExpenses * 3 && totalExpenses > 0) {
      analysis += `🏦 Sua reserva de emergência está baixa. Tente acumular pelo menos 3 meses de gastos (R$ ${(totalExpenses * 3).toLocaleString('pt-BR')}).<br>`;
    } else if (emergencyFund?.current_amount >= totalExpenses * 6) {
      analysis += `🏆 Excelente! Você tem mais de 6 meses de reserva. Parabens pela seguranca financeira!<br>`;
    }
    
    if ((scoreData?.score || 0) >= 70) {
      analysis += `🎯 Seu score financeiro está otimo! Continue com o bom trabalho.<br>`;
    } else if ((scoreData?.score || 0) < 50) {
      analysis += `📊 Seu score está baixo. Foque em pagar dívidas e construir reserva para melhorar.<br>`;
    }
    
    analysis += `<br><strong>🐶 O que voce gostaria de saber mais?</strong>`;
    
    // Registrar análise para auditoria
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'AI_ANALYSIS',
        table_name: 'financial_analysis',
        new_value: { period, savings_rate: savingsRate, score: scoreData?.score }
      });
    
    res.json({ analysis });
    
  } catch (error) {
    console.error('Erro na análise financeira:', error);
    res.status(500).json({ 
      analysis: '🐶 Desculpe, não consegui gerar a análise financeira no momento. Tente novamente mais tarde!',
      error: error.message 
    });
  }
});

// ===== CHAT NORMAL =====
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    const msgLower = message.toLowerCase();
    const analiseKeywords = ['analise', 'análise', 'finanças', 'minhas contas', 'meu salário', 'meus gastos', 'situação financeira'];
    const useFinancialData = analiseKeywords.some(keyword => msgLower.includes(keyword));
    
    if (!GROQ_API_KEY || GROQ_API_KEY === '12345') {
      const reply = getFallbackReply(message, useFinancialData, context);
      return res.json({ reply });
    }
    
    const reply = await getGroqReply(message, context, useFinancialData);
    res.json({ reply });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    const msgLower = req.body.message?.toLowerCase() || '';
    const analiseKeywords = ['analise', 'análise', 'finanças', 'minhas contas'];
    const useFinancialData = analiseKeywords.some(keyword => msgLower.includes(keyword));
    const reply = getFallbackReply(req.body.message, useFinancialData, req.body.context);
    res.json({ reply });
  }
});

module.exports = router;