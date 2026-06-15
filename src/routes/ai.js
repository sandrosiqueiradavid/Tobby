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
    
    // MODO DEMO - se não tiver chave ou chave for fake
    if (!GROQ_API_KEY || GROQ_API_KEY === '12345') {
      const fallbackReplies = [
        "🐶 Olá! Sou o Tobby, seu assistente financeiro! Para eu responder com inteligência artificial completa, configure a chave da API Groq no Render. Enquanto isso, posso te dar dicas básicas! 💰\n\n💡 Dica: Para melhores análises, mantenha suas contas sempre atualizadas!",
        "🐶 Au au! Estou em modo básico. Para ativar a IA completa, adicione a variável GROQ_API_KEY no ambiente do Render. Vou te ajudar como posso!\n\n📊 Que tal cadastrar todas as suas contas para eu te dar melhores insights?",
        "🐶 Oi! Ainda estou aprendendo... Quer me ajudar a ficar mais inteligente? Configure a chave da Groq no seu backend. Por enquanto, posso te ajudar com dicas financeiras práticas!\n\n✅ Dica: Separe 20% da sua renda para emergências!"
      ];
      const randomReply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
      return res.json({ reply: randomReply });
    }
    
    // Construir contexto do usuário
    const userContext = `
      Informações do usuário:
      - Salário: R$ ${context?.salary?.toLocaleString('pt-BR') || 0}
      - Total de contas cadastradas: ${context?.billsCount || 0}
      - Contas pendentes: ${context?.pendingBills || 0}
      - Contas atrasadas: ${context?.lateBills || 0}
    `;
    
    // Chamar API da Groq
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
            content: `Você é o Tobby IA, um assistente financeiro amigável, acolhedor e prático do aplicativo Tobby.
            Você tem personalidade de um cachorro chamado Tobby: leal, animado e sempre pronto para ajudar.
            Use emojis moderadamente (🐶, 💰, 📊, ✅, ⚠️) para tornar a conversa mais amigável.
            Responda SEMPRE em português brasileiro.
            Seja objetivo, mas acolhedor.
            Se o usuário pedir análise financeira, use os dados do contexto fornecido.
            Dê dicas práticas e realistas.
            Nunca invente dados que não estão no contexto.
            Se não souber algo, diga que vai aprender e sugira cadastrar mais informações no app.`
          },
          {
            role: 'user',
            content: `${userContext}\n\nPergunta do usuário: ${message}`
          }
        ],
        max_tokens: 600,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro Groq:', data);
      return res.json({ 
        reply: '🐶 Desculpe, estou com dificuldades técnicas. Tente novamente em alguns instantes!' 
      });
    }
    
    const reply = data.choices?.[0]?.message?.content || 'Não consegui processar sua mensagem. Tente novamente!';
    
    res.json({ reply });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ 
      reply: '🐶 Desculpe, ocorreu um erro. Tente novamente mais tarde!' 
    });
  }
});

module.exports = router;