const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

async function getGroqReply(message, context) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  const salary = context?.salary || 0;
  const billsCount = context?.billsCount || 0;
  const pendingBills = context?.pendingBills || 0;
  const lateBills = context?.lateBills || 0;
  const totalCommitted = context?.totalCommitted || 0;
  const commitmentPercent = context?.commitmentPercent || 0;
  const freeMoney = context?.freeMoney || 0;

  const systemPrompt = `Você é o Tobby IA, um assistente financeiro especialista do aplicativo Tobby.

DADOS REAIS DO USUÁRIO (use estes dados para análises personalizadas):
- Salário mensal: R$ ${salary.toLocaleString('pt-BR')}
- Total de contas: ${billsCount}
- Contas pendentes: ${pendingBills}
- Contas atrasadas: ${lateBills}
- Total de gastos: R$ ${totalCommitted.toLocaleString('pt-BR')}
- Comprometimento: ${commitmentPercent}%
- Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

REGRAS DE FORMATAÇÃO:
1. Use texto puro com emojis (não use HTML)
2. Use quebras de linha com \\n\\n para separar seções
3. Use • para listas
4. Use **texto** para enfatizar
5. Seja acolhedor e prático
6. Use OS DADOS REAIS do usuário acima

Pergunta: ${message}`;

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

function getFallbackReply(message, context) {
  const salary = context?.salary || 0;
  const billsCount = context?.billsCount || 0;
  const pendingBills = context?.pendingBills || 0;
  const lateBills = context?.lateBills || 0;
  const totalCommitted = context?.totalCommitted || 0;
  const commitmentPercent = context?.commitmentPercent || 0;
  const freeMoney = context?.freeMoney || salary;

  const msg = message.toLowerCase();
  
  if (msg.includes('analise') || msg.includes('análise') || msg.includes('finanças') || msg.includes('contas')) {
    if (lateBills > 0) {
      return `🐶 ANALISE FINANCEIRA COMPLETA

⚠️ ALERTA CRITICO: Você tem ${lateBills} conta(s) atrasada(s)!

📊 SEU PANORAMA ATUAL:
• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas no total: ${billsCount}
• Contas atrasadas: ${lateBills}
• Contas pendentes: ${pendingBills}
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}
• Comprometimento da renda: ${commitmentPercent}%
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

🎯 PLANO DE ACAO:
1. PRIORIDADE MAXIMA: Pague as ${lateBills} contas atrasadas imediatamente
2. NEGOCIACAO: Entre em contato com os credores para renegociar multas
3. CORTE DE GASTOS: Reduza despesas não essenciais pelos próximos 30 dias
4. REORGANIZACAO: Use o Tobby para agendar todas as contas do próximo mês

💡 Previsão: Se seguir este plano, em 60 dias sua situação estará regularizada.

🐶 Precisa de ajuda para priorizar quais contas pagar primeiro?`;
    }
    
    if (billsCount === 0) {
      return `🐶 VAMOS COMECAR!

📊 VOCE AINDA NAO TEM CONTAS CADASTRADAS

• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas cadastradas: 0

🎯 PRIMEIROS PASSOS:
1. Vá na aba "Contas" e cadastre suas despesas fixas (aluguel, energia, internet)
2. Adicione gastos variáveis (supermercado, transporte, lazer)
3. Quanto mais dados você cadastrar, melhores serão minhas análises!

🐶 Vamos nessa? Estou aqui para te ajudar em cada passo!`;
    }
    
    return `🐶 RESUMO FINANCEIRO

📊 SEUS NUMEROS:
• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas cadastradas: ${billsCount}
• Pendentes: ${pendingBills}
• Atrasadas: ${lateBills}
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}
• Comprometimento: ${commitmentPercent}%
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

🎯 CLASSIFICACAO: ${commitmentPercent <= 50 ? '✅ Financeiro Saudavel' : (commitmentPercent <= 70 ? '⚠️ Atencao Necessaria' : '🔴 Risco Financeiro')}

🐶 Como posso te ajudar a melhorar sua saude financeira?`;
  }
  
  if (msg.includes('investir') || msg.includes('investimento')) {
    return `🐶 GUIA DE INVESTIMENTOS PARA INICIANTES

💰 COM SEU PERFIL (Sobra: R$ ${freeMoney.toLocaleString('pt-BR')}/mes)

📊 POR ONDE COMECAR:
1. Tesouro Selic (segurança máxima, liquidez diaria)
2. CDB 100% CDI (proteção FGC, rendimento bom)
3. LCI/LCA (isentos de IR, seguros)

🐶 Quer simular quanto seu dinheiro renderia?`;
  }
  
  return `🐶 Ola! Sou o Tobby, seu assistente financeiro!

💰 Tenho acesso aos seus dados: salario de R$ ${salary.toLocaleString('pt-BR')}, ${billsCount} contas cadastradas.

📊 O que posso fazer por voce?
• "Analise minhas finanças" - diagnóstico completo
• "Como economizar?" - dicas personalizadas
• "Dicas de investimentos" - guia para iniciantes

🐶 O que você gostaria de saber hoje?`;
}

router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY || GROQ_API_KEY === '12345') {
      const reply = getFallbackReply(message, context);
      return res.json({ reply });
    }
    
    const reply = await getGroqReply(message, context);
    res.json({ reply });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    const reply = getFallbackReply(req.body.message, req.body.context);
    res.json({ reply });
  }
});

module.exports = router;