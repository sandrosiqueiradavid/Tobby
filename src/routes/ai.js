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

  const systemPrompt = `Você é o Tobby IA, um assistente financeiro especialista e amigável do aplicativo Tobby. Você tem personalidade de um cachorro chamado Tobby: leal, inteligente, animado e sempre pronto para ajudar.

DADOS REAIS DO USUÁRIO (use estes dados para análises personalizadas):
- Salário mensal: R$ ${salary.toLocaleString('pt-BR')}
- Total de contas cadastradas: ${billsCount}
- Contas pendentes: ${pendingBills}
- Contas atrasadas: ${lateBills}
- Total de gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}
- Comprometimento da renda: ${commitmentPercent}%
- Saldo livre mensal: R$ ${freeMoney.toLocaleString('pt-BR')}

REGRAS IMPORTANTES:
1. Responda SEMPRE em português brasileiro
2. Use emojis moderadamente (🐶, 💰, 📊, ✅, ⚠️, 📈)
3. Seja prático, acolhedor e dê conselhos realistas
4. Quando o usuário pedir análise, use OS DADOS REAIS fornecidos acima
5. Dê sugestões específicas baseadas no cenário do usuário
6. Se o usuário estiver com contas atrasadas (>0), priorize ajuda para resolver isso
7. Se o comprometimento da renda for >70%, alerte que é crítico e sugira redução de gastos
8. Se o comprometimento for >50% e <70%, alerte que está alto e sugira cuidado
9. Se o comprometimento for <50%, parabenize e sugira investimentos
10. Se o saldo livre for >30% da renda, sugira investimentos e reserva de emergência
11. Seja honesto: se os dados indicarem problemas financeiros, fale claramente
12. Mantenha um tom positivo e encorajador, mesmo em situações difíceis

Pergunta do usuário: ${message}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ],
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

// Fallback quando Groq não está disponível
function getFallbackReply(message, context) {
  const salary = context?.salary || 0;
  const billsCount = context?.billsCount || 0;
  const pendingBills = context?.pendingBills || 0;
  const lateBills = context?.lateBills || 0;
  const commitmentPercent = context?.commitmentPercent || 0;
  const freeMoney = context?.freeMoney || salary;
  const totalCommitted = context?.totalCommitted || 0;

  const msg = message.toLowerCase();
  
  if (msg.includes('analise') || msg.includes('análise') || msg.includes('finanças') || msg.includes('situação')) {
    if (lateBills > 0) {
      return `🐶 **ANÁLISE FINANCEIRA COMPLETA**

⚠️ **ALERTA CRÍTICO:** Você tem ${lateBills} conta(s) atrasada(s)!

📊 **SEU PANORAMA ATUAL:**
• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas no total: ${billsCount}
• Contas atrasadas: ${lateBills}
• Contas pendentes: ${pendingBills}
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}
• Comprometimento da renda: ${commitmentPercent}%
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

🎯 **PLANO DE AÇÃO:**
1. **PRIORIDADE MÁXIMA:** Pague as ${lateBills} contas atrasadas imediatamente
2. **NEGOCIAÇÃO:** Entre em contato com os credores para renegociar multas
3. **CORTE DE GASTOS:** Reduza despesas não essenciais pelos próximos 30 dias
4. **REORGANIZAÇÃO:** Use o Tobby para agendar todas as contas do próximo mês

💡 **Previsão:** Se seguir este plano, em 60 dias sua situação estará regularizada.

Precisa de ajuda para priorizar quais contas pagar primeiro? 🐶`;
    }
    
    if (commitmentPercent > 70) {
      return `🐶 **ANÁLISE FINANCEIRA**

📊 **DIAGNÓSTICO:** Seu comprometimento de renda está CRÍTICO (${commitmentPercent}%)

• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}
• Comprometido: ${commitmentPercent}% da renda
• Sobra mensal: R$ ${freeMoney.toLocaleString('pt-BR')}

⚠️ **RISCO ALTO:** Com mais de 70% da renda comprometida, você está em situação de risco financeiro.

🎯 **RECOMENDAÇÕES URGENTES:**
1. Revise todas as contas de lazer e assinaturas - cancele o que não for essencial
2. Considere trocar serviços (internet, plano de saúde) por opções mais baratas
3. Busque fontes extras de renda (freelas, hora extra, bicos)
4. Evite ABSOLUTAMENTE novas dívidas
5. Tente renegociar dívidas com juros altos

💰 **META URGENTE:** Reduzir comprometimento para 50% em 3 meses

Quer ajuda para identificar quais contas podem ser reduzidas primeiro? 🐶`;
    }
    
    if (commitmentPercent > 50) {
      return `🐶 **ANÁLISE FINANCEIRA**

📊 **DIAGNÓSTICO:** Seu comprometimento de renda está ALTO (${commitmentPercent}%)

• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}
• Comprometido: ${commitmentPercent}% da renda
• Sobra mensal: R$ ${freeMoney.toLocaleString('pt-BR')}

⚠️ **ATENÇÃO:** Com mais de 50% da renda comprometida, sobra pouco para imprevistos e investimentos.

🎯 **RECOMENDAÇÕES:**
1. Revise contas de lazer e assinaturas
2. Considere trocar serviços caros por opções mais baratas
3. Busque fontes extras de renda
4. Evite novas dívidas

💰 **META:** Reduzir comprometimento para 50% em 6 meses

Quer ajuda para identificar quais contas podem ser reduzidas? 🐶`;
    }
    
    if (freeMoney > salary * 0.3) {
      return `🐶 **ANÁLISE FINANCEIRA - PARABÉNS!**

✅ **DIAGNÓSTICO EXCELENTE!**

• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}
• Comprometimento: ${commitmentPercent}% da renda
• Sobra mensal: R$ ${freeMoney.toLocaleString('pt-BR')}
• Contas em dia: ✅

📈 **OPORTUNIDADES:**
Com essa sobra saudável, você está pronto para:
1. **INVESTIR:** Comece com R$ ${(freeMoney * 0.5).toLocaleString('pt-BR')} por mês
2. **RESERVA DE EMERGÊNCIA:** Alcançar 6 meses de custos (R$ ${(totalCommitted * 6).toLocaleString('pt-BR')})
3. **REALIZAR SONHOS:** Viagem, curso, entrada de imóvel

🎯 **SUGESTÃO DE ALOCAÇÃO:**
• 50% investimentos (renda fixa)
• 30% lazer/qualidade de vida
• 20% reserva de emergência

Que tal simular quanto seu dinheiro pode render? 🐶`;
    }
    
    return `🐶 **RESUMO FINANCEIRO**

📊 **SEUS NÚMEROS:**
• Salário: R$ ${salary.toLocaleString('pt-BR')}
• Contas cadastradas: ${billsCount}
• Pendentes: ${pendingBills}
• Atrasadas: ${lateBills}
• Gastos mensais: R$ ${totalCommitted.toLocaleString('pt-BR')}
• Comprometimento: ${commitmentPercent}%
• Saldo livre: R$ ${freeMoney.toLocaleString('pt-BR')}

🎯 **CLASSIFICAÇÃO:** ${commitmentPercent <= 50 ? '✅ Financeiro Saudável' : (commitmentPercent <= 70 ? '⚠️ Atenção Necessária' : '🔴 Risco Financeiro')}

💡 **PRÓXIMO PASSO:** Cadastre mais contas no Tobby para análises ainda mais precisas!

Como posso te ajudar a melhorar sua saúde financeira? 🐶`;
  }
  
  if (msg.includes('investir') || msg.includes('investimento')) {
    return `🐶 **GUIA DE INVESTIMENTOS PARA INICIANTES**

💰 **COM SEU PERFIL (Sobra: R$ ${freeMoney.toLocaleString('pt-BR')}/mês)**

📊 **POR ONDE COMEÇAR:**
1. **Tesouro Selic** (segurança máxima, liquidez diária)
2. **CDB 100% CDI** (proteção FGC, rendimento bom)
3. **LCI/LCA** (isentos de IR, seguros)

🎯 **ALOCAÇÃO SUGERIDA:**
• 60% Renda Fixa Segura (Tesouro Selic/CDB)
• 20% Renda Fixa com rentabilidade maior (CRI/CRA)
• 20% Reserva de oportunidades (ações/FIIs)

📈 **SIMULAÇÃO:**
Investindo R$ ${(freeMoney * 0.5).toLocaleString('pt-BR')}/mês:
• Em 1 ano: R$ ${(freeMoney * 0.5 * 12 * 1.1).toLocaleString('pt-BR')} (estimado)
• Em 5 anos: R$ ${(freeMoney * 0.5 * 60 * 1.5).toLocaleString('pt-BR')} (estimado)

⚠️ **REGRAS IMPORTANTES:**
• Monte reserva de emergência PRIMEIRO
• Diversifique seus investimentos
• Invista consistentemente, não espere o momento perfeito
• Estude antes de arriscar

Quer simular quanto seu dinheiro renderia em cada opção específica? 🐶`;
  }
  
  if (msg.includes('economizar') || msg.includes('economia') || msg.includes('poupar')) {
    return `🐶 **ESTRATÉGIAS PARA ECONOMIZAR**

💰 **COM SEU PERFIL (Gastos: R$ ${totalCommitted.toLocaleString('pt-BR')}/mês)**

📋 **PLANO DE 30 DIAS:**
1. **Liste todos os gastos** (use o Tobby para categorizar)
2. **Identifique os gastos inúteis** (assinaturas não usadas, juros, multas)
3. **Estabeleça limites por categoria**
4. **Use a regra 50/30/20**:
   - 50% Necessidades (moradia, alimentação, transporte)
   - 30% Desejos (lazer, restaurantes, compras)
   - 20% Economia/investimentos

🎯 **ECONOMIA MENSAL POTENCIAL:**
Cortando 20% dos gastos supérfluos, você poderia economizar R$ ${(totalCommitted * 0.2).toLocaleString('pt-BR')} por mês!

💰 **EM 1 ANO:** R$ ${(totalCommitted * 0.2 * 12).toLocaleString('pt-BR')} economizados!

📊 **EXEMPLOS PRÁTICOS DE CORTE:**
• Café na rua (R$ 10/dia) → R$ 300/mês economizados
• Ifood 3x/semana (R$ 50) → R$ 600/mês
• Academia cara → trocar por opção de R$ 100 (economia de R$ 200+)

Que tal começar hoje? Posso te dar dicas específicas para cada categoria de gasto! 🐶`;
  }
  
  if (msg.includes('divida') || msg.includes('dívida') || msg.includes('emprestimo') || msg.includes('cartão')) {
    return `🐶 **COMO SAIR DAS DÍVIDAS**

📊 **SUA SITUAÇÃO ATUAL:**
• Dívidas/contas atrasadas: ${lateBills}
• Comprometimento da renda: ${commitmentPercent}%

🎯 **PLANO DE AÇÃO EM 5 PASSOS:**

1. **LISTE TODAS AS DÍVIDAS**
   - Use o Tobby para organizar por valor e juros
   - Priorize as com juros mais altos (cartão de crédito, cheque especial)

2. **NEGOCIE COM OS CREDORES**
   - Peça descontos para pagamento à vista
   - Renegocie parcelamentos com juros menores
   - Banco Central tem serviço de negociação de dívidas

3. **CORTE GASTOS TEMPORARIAMENTE**
   - Suspenda assinaturas não essenciais
   - Reduza lazer e refeições fora
   - Use o dinheiro economizado para pagar dívidas

4. **EVITE NOVAS DÍVIDAS**
   - Use dinheiro/debito, não crédito
   - Cancele cartões se necessário
   - Não faça novos empréstimos

5. **CRIE UM FUNDO DE EMERGÊNCIA**
   - Após quitar, guarde 3-6 meses de custos
   - Evite cair na mesma situação

💪 **VOCÊ CONSEGUE!** Já ajudei muitos usuários a saírem das dívidas. O importante é começar HOJE!

Quer que eu detalhe algum desses passos? 🐶`;
  }
  
  const responses = [
    `🐶 Olá! Sou o Tobby, seu assistente financeiro. Posso fazer uma análise completa das suas finanças, dar dicas de investimentos ou ajudar a organizar seu orçamento. O que você precisa?`,
    
    `🐶 Tobby aqui! Quer saber como está sua saúde financeira? Tenho acesso aos seus dados: salário de R$ ${salary.toLocaleString('pt-BR')}, ${billsCount} contas cadastradas. Posso analisar tudo para você!`,
    
    `🐶 Au au! Com os dados que você cadastrou, posso te dar um diagnóstico completo. Pergunte "analise minhas finanças" para começar!`,
    
    `🐶 Estou aqui para ajudar! Posso analisar seus gastos, sugerir investimentos ou ajudar a planejar seus sonhos. O que você gostaria de saber hoje?`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    // Se não tiver chave do Groq ou for a chave fake, usa fallback
    if (!GROQ_API_KEY || GROQ_API_KEY === '12345') {
      console.log('🔧 Usando fallback (GROQ_API_KEY não configurada)');
      const reply = getFallbackReply(message, context);
      return res.json({ reply });
    }
    
    console.log('🤖 Usando Groq API');
    const reply = await getGroqReply(message, context);
    res.json({ reply });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    const reply = getFallbackReply(req.body.message, req.body.context);
    res.json({ reply });
  }
});

module.exports = router;