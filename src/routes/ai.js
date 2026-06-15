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

DADOS REAIS DO USUÁRIO:
- Salário mensal: R$ ${salary.toLocaleString('pt-BR')}
- Total de contas: ${billsCount}
- Contas pendentes: ${pendingBills}
- Contas atrasadas: ${lateBills}
- Total de gastos: R$ ${totalCommitted.toLocaleString('pt-BR')}
- Comprometimento: ${commitmentPercent}%
- Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

REGRAS DE FORMATAÇÃO (IMPORTANTE!):
1. Use HTML para formatação: <strong>texto</strong> para negrito, <br> para quebra de linha
2. Use emojis: 🐶, 💰, 📊, ✅, ⚠️, 📈
3. Estruture a resposta com:
   - Títulos: <strong>📊 TÍTULO</strong>
   - Listas: use • ou <br>• item
   - Seções: use <br><br> entre seções
4. Seja acolhedor e prático
5. Use OS DADOS REAIS do usuário acima

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
      return `<strong>🐶 ANÁLISE FINANCEIRA COMPLETA</strong><br><br>
<strong>⚠️ ALERTA CRÍTICO:</strong> Você tem ${lateBills} conta(s) atrasada(s)!<br><br>
<strong>📊 SEU PANORAMA ATUAL:</strong><br>
• Salário: <strong>R$ ${salary.toLocaleString('pt-BR')}</strong><br>
• Contas no total: ${billsCount}<br>
• Contas atrasadas: <strong style="color:#EF4444">${lateBills}</strong><br>
• Contas pendentes: ${pendingBills}<br>
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}<br>
• Comprometimento da renda: <strong>${commitmentPercent}%</strong><br>
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}<br><br>

<strong>🎯 PLANO DE AÇÃO:</strong><br>
1. <strong>PRIORIDADE MÁXIMA:</strong> Pague as ${lateBills} contas atrasadas imediatamente<br>
2. <strong>NEGOCIAÇÃO:</strong> Entre em contato com os credores para renegociar multas<br>
3. <strong>CORTE DE GASTOS:</strong> Reduza despesas não essenciais pelos próximos 30 dias<br>
4. <strong>REORGANIZAÇÃO:</strong> Use o Tobby para agendar todas as contas do próximo mês<br><br>

💡 <strong>Previsão:</strong> Se seguir este plano, em 60 dias sua situação estará regularizada.<br><br>

🐶 Precisa de ajuda para priorizar quais contas pagar primeiro?`;
    }
    
    if (billsCount === 0) {
      return `<strong>🐶 VAMOS COMEÇAR!</strong><br><br>
📊 <strong>VOCÊ AINDA NÃO TEM CONTAS CADASTRADAS</strong><br><br>
• Salário: <strong>R$ ${salary.toLocaleString('pt-BR')}</strong><br>
• Contas cadastradas: 0<br><br>

<strong>🎯 PRIMEIROS PASSOS:</strong><br>
1. Vá na aba <strong>"Contas"</strong> e cadastre suas despesas fixas (aluguel, energia, internet)<br>
2. Adicione gastos variáveis (supermercado, transporte, lazer)<br>
3. Quanto mais dados você cadastrar, melhores serão minhas análises!<br><br>

🐶 Vamos nessa? Estou aqui para te ajudar em cada passo!`;
    }
    
    if (freeMoney > salary * 0.3 && salary > 0) {
      return `<strong>🐶 ANÁLISE FINANCEIRA - PARABÉNS!</strong><br><br>
<strong>✅ DIAGNÓSTICO EXCELENTE!</strong><br><br>
• Salário: <strong>R$ ${salary.toLocaleString('pt-BR')}</strong><br>
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}<br>
• Comprometimento: <strong style="color:#10B981">${commitmentPercent}%</strong> da renda<br>
• Sobra mensal: <strong>R$ ${freeMoney.toLocaleString('pt-BR')}</strong><br><br>

<strong>📈 OPORTUNIDADES:</strong><br>
Com essa sobra saudável, que tal começar a investir?<br><br>

🐶 Quer dicas de investimentos para iniciantes?`;
    }
    
    return `<strong>🐶 RESUMO FINANCEIRO</strong><br><br>
<strong>📊 SEUS NÚMEROS:</strong><br>
• Salário: <strong>R$ ${salary.toLocaleString('pt-BR')}</strong><br>
• Contas cadastradas: ${billsCount}<br>
• Pendentes: ${pendingBills}<br>
• Atrasadas: ${lateBills}<br>
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}<br>
• Comprometimento: ${commitmentPercent}%<br>
• Saldo livre: <strong>R$ ${freeMoney.toLocaleString('pt-BR')}</strong><br><br>

🐶 Como posso te ajudar a melhorar sua saúde financeira?`;
  }
  
  if (msg.includes('investir') || msg.includes('investimento')) {
    return `<strong>🐶 GUIA DE INVESTIMENTOS PARA INICIANTES</strong><br><br>
💰 <strong>COM SEU PERFIL (Sobra: R$ ${freeMoney.toLocaleString('pt-BR')}/mês)</strong><br><br>

<strong>📊 POR ONDE COMEÇAR:</strong><br>
1. <strong>Tesouro Selic</strong> (segurança máxima, liquidez diária)<br>
2. <strong>CDB 100% CDI</strong> (proteção FGC, rendimento bom)<br>
3. <strong>LCI/LCA</strong> (isentos de IR, seguros)<br><br>

🐶 Quer simular quanto seu dinheiro renderia?`;
  }
  
  return `<strong>🐶 Olá! Sou o Tobby, seu assistente financeiro!</strong><br><br>
💰 Tenho acesso aos seus dados: salário de <strong>R$ ${salary.toLocaleString('pt-BR')}</strong>, ${billsCount} contas cadastradas.<br><br>
📊 <strong>O que posso fazer por você?</strong><br>
• <strong>"Analise minhas finanças"</strong> - diagnóstico completo<br>
• <strong>"Como economizar?"</strong> - dicas personalizadas<br>
• <strong>"Dicas de investimentos"</strong> - guia para iniciantes<br><br>

🐶 O que você gostaria de saber hoje?`;
}

router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    console.log('🔍 GROQ_API_KEY configurada:', GROQ_API_KEY ? 'SIM' : 'NÃO');
    console.log('🔍 É a chave fake?', GROQ_API_KEY === '12345' ? 'SIM' : 'NÃO');
    
    if (!GROQ_API_KEY || GROQ_API_KEY === '12345') {
      console.log('⚠️ Usando fallback (GROQ_API_KEY não configurada ou é fake)');
      const reply = getFallbackReply(message, context);
      return res.json({ reply });
    }
    
    console.log('✅ Usando Groq API com chave real');
    const reply = await getGroqReply(message, context);
    res.json({ reply });
    
  } catch (error) {
    console.error('❌ Erro no chat:', error);
    const reply = getFallbackReply(req.body.message, req.body.context);
    res.json({ reply });
  }
});

module.exports = router;