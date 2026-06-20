const { Groq } = require('groq-sdk');

class AIService {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  async analyzeJournal(text, mood) {
    const prompt = `
Analise este registro financeiro de um usuário e identifique:
1. Emoções detectadas
2. Gatilhos financeiros
3. Padrões de consumo
4. Recomendações personalizadas

Texto: "${text}"
Sentimento indicado: ${mood}

Responda em JSON:
{
  "emotions": ["lista de emoções"],
  "triggers": ["lista de gatilhos"],
  "patterns": ["lista de padrões"],
  "recommendations": ["lista de recomendações"]
}`;

    const response = await this.client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });

    return JSON.parse(response.choices[0].message.content);
  }

  async getDailyBriefing(userData) {
    const prompt = `
Gere um briefing matinal personalizado para um usuário do Tobby.

Dados do usuário:
- Nome: ${userData.name}
- Salário: R$ ${userData.salary}
- Score Financeiro: ${userData.score}/100
- Contas a vencer esta semana: ${userData.dueBills}
- Progresso da meta principal: ${userData.goalProgress}%

Gere um resumo motivacional e prático para o dia.`;
  }

  async generateBehaviorInsight(behaviorData) {
    // Análise de comportamento
  }

  async biblicalAdvice(financialContext) {
    if (!userData.enableBiblicalAdvisor) return null;
    // Prompt com princípios bíblicos
  }

  async analyzeImport(documentText) {
    // Classificação de importação
  }

  async generateMissions(userData) {
    // Geração de missões semanais
  }
}

module.exports = AIService;