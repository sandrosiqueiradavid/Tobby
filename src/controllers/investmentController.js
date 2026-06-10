const supabase = require('../db/supabase');

const investmentController = {
  getNews: async (req, res) => {
    try {
      const news = [
        {
          title: '🐶 Selic mantida em 10,5% - Bom para investimentos de renda fixa',
          summary: 'Comitê mantém taxa básica de juros. Especialistas recomendam Tesouro Direto.',
          category: 'economia',
          sentiment: 'positive'
        },
        {
          title: '📈 Bolsa sobe com expectativa de reforma tributária',
          summary: 'Ibovespa opera em alta impulsionado por papéis de consumo e bancos.',
          category: 'bolsa',
          sentiment: 'positive'
        },
        {
          title: '💰 Dólar fecha em queda após anúncio de leilão de reservas',
          summary: 'Moeda americana recua frente ao real com intervenção do Banco Central.',
          category: 'cambio',
          sentiment: 'positive'
        },
        {
          title: '🏠 Mercado imobiliário aquecido: vale a pena investir?',
          summary: 'Fundos imobiliários (FIIs) entregam bons dividendos. Veja os mais recomendados.',
          category: 'fii',
          sentiment: 'neutral'
        }
      ];
      
      const { data: user } = await supabase
        .from('users')
        .select('salary')
        .eq('id', req.userId)
        .single();
      
      const salary = user?.salary || 0;
      let tips = [];
      
      if (salary < 3000) {
        tips.push({
          title: '🐣 Comece pelo básico',
          description: 'Monte uma reserva de emergência de 3-6 meses antes de investir. CDB com liquidez diária é uma boa opção.'
        });
      } else if (salary < 8000) {
        tips.push({
          title: '🎯 Diversifique seus investimentos',
          description: 'Além da renda fixa, considere FIIs e ações de dividendos para aumentar sua rentabilidade.'
        });
      } else {
        tips.push({
          title: '🚀 Perfil arrojado',
          description: 'Com maior capacidade de investimento, analise small caps e ativos internacionais para diversificação global.'
        });
      }
      
      res.json({
        news: news,
        tips: tips,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Investment news error:', err);
      res.status(500).json({ error: 'Erro ao buscar notícias' });
    }
  },
  
  getRecommendations: async (req, res) => {
    try {
      const recommendations = {
        fixedIncome: [
          { name: 'Tesouro Selic 2029', return: 'Selic + 0,1%', risk: 'Baixo', min: 30 },
          { name: 'Tesouro IPCA+ 2035', return: 'IPCA + 6,2%', risk: 'Baixo', min: 30 },
          { name: 'CDB Banco XP', return: '120% CDI', risk: 'Baixo', min: 1000 }
        ],
        fiis: [
          { name: 'HGLG11', return: '0,85% ao mês', segment: 'Galpões logísticos', yield: '7.2%' },
          { name: 'KNRI11', return: '0,72% ao mês', segment: 'Lajes corporativas', yield: '6.8%' }
        ],
        stocks: [
          { name: 'ITUB4', return: '+23% no ano', segment: 'Financeiro', dividendYield: '5.4%' },
          { name: 'PETR4', return: '+18% no ano', segment: 'Petróleo', dividendYield: '8.2%' }
        ]
      };
      
      res.json(recommendations);
    } catch (err) {
      res.status(500).json({ error: 'Erro ao buscar recomendações' });
    }
  }
};

module.exports = investmentController;