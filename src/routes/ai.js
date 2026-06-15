const express = require('express');
const router = express.Router();
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
  
  // Palavras-chave que indicam que o usuário QUER análise financeira
  const analiseKeywords = ['analise', 'análise', 'finanças', 'contas', 'salário', 'gastos', 'despesas', 'economizar', 'investir', 'divida', 'dívida'];
  
  const querAnalise = analiseKeywords.some(keyword => msg.includes(keyword));
  
  // Se não quer análise, respostas simples e amigáveis
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
  
  // Se quer análise, usa os dados do usuário
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

router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    // Verificar se o usuário PEDIU para analisar as finanças
    const msgLower = message.toLowerCase();
    const analiseKeywords = ['analise', 'análise', 'finanças', 'minhas contas', 'meu salário', 'meus gastos', 'situação financeira'];
    const useFinancialData = analiseKeywords.some(keyword => msgLower.includes(keyword));
    
    // Se não tem chave ou é fake, usa fallback
    if (!GROQ_API_KEY || GROQ_API_KEY === '12345') {
      const reply = getFallbackReply(message, useFinancialData, context);
      return res.json({ reply });
    }
    
    // Usa Groq
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