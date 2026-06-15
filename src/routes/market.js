const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Rota de chat com IA via Groq
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    // MODO DEMO - respostas inteligentes sem API
    // Respostas baseadas no contexto do usuário
    const pendingBills = context?.pendingBills || 0;
    const lateBills = context?.lateBills || 0;
    const salary = context?.salary || 0;
    const billsCount = context?.billsCount || 0;
    
    let reply = '';
    
    // Análise personalizada baseada nos dados do usuário
    if (message.toLowerCase().includes('analise') || message.toLowerCase().includes('finanças')) {
      if (lateBills > 0) {
        reply = `🐶 Analisando suas finanças...\n\n⚠️ **Atenção!** Você tem ${lateBills} conta(s) atrasada(s). Isso pode gerar juros e multas. Minha sugestão: priorize o pagamento dessas contas imediatamente.\n\n📊 **Resumo:**\n• Salário: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salary)}\n• Total de contas: ${billsCount}\n• Contas atrasadas: ${lateBills}\n• Contas pendentes: ${pendingBills}\n\n💡 **Dica:** Tente negociar as contas atrasadas e organize um planejamento para os próximos meses!`;
      } else if (pendingBills > 0) {
        reply = `🐶 Suas finanças estão organizadas!\n\n📊 **Resumo:**\n• Salário: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salary)}\n• Total de contas: ${billsCount}\n• Contas pendentes: ${pendingBills}\n\n✅ Você não tem contas atrasadas! Continue assim!\n\n💡 **Dica:** Separe 20% do seu salário para emergências e invista o restante.`;
      } else {
        reply = `🐶 Parabéns! Você não tem contas pendentes!\n\n📊 **Resumo:**\n• Salário: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salary)}\n• Total de contas cadastradas: ${billsCount}\n\n💰 Com todas as contas em dia, que tal começar a investir? Posso te ajudar com dicas de investimentos!`;
      }
    }
    else if (message.toLowerCase().includes('economizar') || message.toLowerCase().includes('economia')) {
      reply = `🐶 **Dicas para economizar dinheiro:**\n\n1. 📝 **Registre todos os gastos** - Use o Tobby para acompanhar cada real\n2. 🎯 **Defina metas** - Objetivos claros ajudam a manter o foco\n3. 🍽️ **Reduza refeições fora** - Cozinhar em casa economiza muito\n4. 📺 **Revise assinaturas** - Cancele serviços que você não usa\n5. 🚗 **Use transporte público** - Economize com combustível e estacionamento\n\nQue tal começar hoje mesmo? 🐶`;
    }
    else if (message.toLowerCase().includes('investir') || message.toLowerCase().includes('investimento')) {
      reply = `🐶 **Dicas para começar a investir:**\n\n1. 💰 **Monte uma reserva de emergência** (6 meses de custos)\n2. 📚 **Estude antes de investir** - Conhecimento é poder\n3. 🔄 **Diversifique** - Não coloque todos os ovos na mesma cesta\n4. 📈 **Comece com renda fixa** - Tesouro Selic é um bom início\n5. ⏰ **Seja consistente** - Invista um valor todo mês\n\nQuer saber mais sobre algum tipo específico de investimento? 🐶`;
    }
    else if (message.toLowerCase().includes('selic') || message.toLowerCase().includes('juros')) {
      reply = `🐶 **O que é a Taxa Selic?**\n\nA Selic é a taxa básica de juros da economia brasileira. Ela influencia todas as outras taxas, como empréstimos, financiamentos e investimentos.\n\n📊 **Impactos:**\n• Selic alta → investimentos rendem mais, mas crédito fica mais caro\n• Selic baixa → crédito mais barato, mas renda fixa rende menos\n\nAtualmente a Selic está em um patamar que permite bons rendimentos em investimentos como CDB e Tesouro Selic!\n\nQuer simular quanto seu dinheiro pode render? 🐶`;
    }
    else if (message.toLowerCase().includes('bitcoin') || message.toLowerCase().includes('cripto')) {
      reply = `🐶 **Sobre Criptomoedas:**\n\nCriptomoedas são ativos digitais que usam criptografia para segurança. As mais conhecidas são Bitcoin (₿) e Ethereum (⟠).\n\n⚠️ **Cuidados:**\n• Alta volatilidade - o preço pode variar muito\n• Invista apenas o que pode perder\n• Estude antes de comprar\n• Use corretoras confiáveis\n\n💡 **Dica:** Para iniciantes, comece com pouco e aprenda aos poucos!\n\nPosso te ajudar com mais alguma coisa? 🐶`;
    }
    else if (message.toLowerCase().includes('divida') || message.toLowerCase().includes('emprestimo')) {
      reply = `🐶 **Como sair das dívidas:**\n\n1. 📋 **Liste todas as dívidas** - Use o Tobby para organizar\n2. 🎯 **Priorize as com juros mais altos** (cartão de crédito, cheque especial)\n3. 🤝 **Negocie** - Entre em contato com os credores\n4. 📅 **Crie um plano de pagamento** - Pagar aos poucos é melhor que não pagar\n5. 💪 **Corte gastos temporariamente** - Foco total em quitar as dívidas\n\nVocê consegue! Estou aqui para ajudar! 🐶`;
    }
    else if (message.toLowerCase().includes('obrigado') || message.toLowerCase().includes('valeu')) {
      reply = `🐶 **Por nada!** Fico feliz em ajudar!\n\nEstou sempre aqui para te ajudar com suas finanças. Continue usando o Tobby para organizar suas contas e alcançar seus objetivos financeiros!\n\nTenha um ótimo dia! 💚`;
    }
    else {
      // Resposta padrão amigável
      const greetings = [
        `🐶 Olá! Como posso ajudar você com suas finanças hoje? Posso dar dicas de economia, investimentos ou ajudar a organizar suas contas!`,
        `🐶 Au au! Tobby aqui! Quer saber mais sobre como economizar, investir ou organizar suas finanças? Estou aqui para ajudar!`,
        `🐶 Oi! Sou o Tobby, seu assistente financeiro. Posso te ajudar com análises financeiras, dicas de economia ou informações sobre o mercado! O que você precisa?`
      ];
      reply = greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    return res.json({ reply });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    res.json({ 
      reply: '🐶 Desculpe, estou com dificuldades técnicas. Tente novamente em alguns instantes! Mas lembre-se: organize suas contas no Tobby e mantenha suas finanças em dia!'
    });
  }
});

module.exports = router;