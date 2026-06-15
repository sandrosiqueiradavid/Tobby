const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ===== NOTÍCIAS DO MERCADO =====
async function getMarketNews() {
  // Notícias atualizadas (mock)
  return [
    {
      title: 'Mercado financeiro aguarda decisão do Copom',
      description: 'Expectativa é de manutenção da Selic em 13,25% ao ano. Decisão sai amanhã com impactos no mercado.',
      url: 'https://www.infomoney.com.br',
      publishedAt: new Date().toISOString(),
      source: 'InfoMoney'
    },
    {
      title: 'Bitcoin opera em alta com expectativa de ETFs nos EUA',
      description: 'Criptomoeda se aproxima dos R$ 350.000 com novo interesse institucional e aprovação de ETFs.',
      url: 'https://www.criptonews.com',
      publishedAt: new Date().toISOString(),
      source: 'Cripto News'
    },
    {
      title: 'Dólar fecha em queda com cenário externo favorável',
      description: 'Moeda americana cai ante o real após dados de emprego nos EUA mostrarem desaceleração.',
      url: 'https://www.valor.com.br',
      publishedAt: new Date().toISOString(),
      source: 'Valor Econômico'
    },
    {
      title: 'IPCA fica abaixo do esperado em maio',
      description: 'Inflação oficial do país mostra desaceleração, abrindo espaço para cortes de juros ainda este ano.',
      url: 'https://www.ibge.gov.br',
      publishedAt: new Date().toISOString(),
      source: 'IBGE'
    },
    {
      title: 'Bolsas europeias fecham em alta com dados econômicos',
      description: 'Investidores reagem positivamente a indicadores de crescimento na zona do euro e queda da inflação.',
      url: 'https://www.bloomberg.com',
      publishedAt: new Date().toISOString(),
      source: 'Bloomberg'
    },
    {
      title: 'Tesouro Direto bate recorde de investidores',
      description: 'Programa de títulos públicos atinge maior número de investidores da história, impulsionado pela Selic alta.',
      url: 'https://www.tesourodireto.com.br',
      publishedAt: new Date().toISOString(),
      source: 'Tesouro Direto'
    }
  ];
}

// ===== ENDPOINT PRINCIPAL =====
router.get('/indicators', async (req, res) => {
  try {
    const news = await getMarketNews();
    
    res.json({
      success: true,
      updatedAt: new Date().toISOString(),
      news: news
    });
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar notícias',
      news: []
    });
  }
});

module.exports = router;