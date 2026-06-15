const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ===== INDICADORES ECONÔMICOS (Banco Central) =====
async function getSelic() {
  try {
    const response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json');
    const data = await response.json();
    if (data && data.length > 0) {
      const lastValue = data[data.length - 1].valor;
      return { value: parseFloat(lastValue).toFixed(2), date: data[data.length - 1].data };
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar Selic:', error);
    return null;
  }
}

async function getIPCA() {
  try {
    const response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json');
    const data = await response.json();
    if (data && data.length > 0) {
      const lastValue = data[data.length - 1].valor;
      return { value: parseFloat(lastValue).toFixed(2), date: data[data.length - 1].data };
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar IPCA:', error);
    return null;
  }
}

async function getDollar() {
  try {
    const response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json');
    const data = await response.json();
    if (data && data.length > 0) {
      const lastValue = data[data.length - 1].valor;
      return { value: parseFloat(lastValue).toFixed(2), date: data[data.length - 1].data };
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar Dólar:', error);
    return null;
  }
}

// ===== CRIPTOMOEDAS (CoinGecko) =====
async function getCryptoPrices() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano&vs_currencies=brl&include_24hr_change=true'
    );
    const data = await response.json();
    return {
      bitcoin: {
        brl: data.bitcoin?.brl || 0,
        change_24h: data.bitcoin?.brl_24h_change?.toFixed(2) || 0
      },
      ethereum: {
        brl: data.ethereum?.brl || 0,
        change_24h: data.ethereum?.brl_24h_change?.toFixed(2) || 0
      },
      solana: {
        brl: data.solana?.brl || 0,
        change_24h: data.solana?.brl_24h_change?.toFixed(2) || 0
      }
    };
  } catch (error) {
    console.error('Erro ao buscar criptomoedas:', error);
    return null;
  }
}

// ===== NOTÍCIAS (mock - depois pode adicionar GNews) =====
async function getMarketNews() {
  return [
    {
      title: 'Mercado financeiro aguarda decisão do Copom',
      description: 'Expectativa é de manutenção da Selic em 10,5% ao ano.',
      url: '#',
      publishedAt: new Date().toISOString(),
      source: 'Economia Hoje'
    },
    {
      title: 'Bitcoin opera em alta com expectativa de ETFs',
      description: 'Criptomoeda se aproxima dos R$ 350.000.',
      url: '#',
      publishedAt: new Date().toISOString(),
      source: 'Cripto News'
    },
    {
      title: 'Dólar fecha em queda com cenário externo favorável',
      description: 'Moeda americana cai ante o real após dados de emprego nos EUA.',
      url: '#',
      publishedAt: new Date().toISOString(),
      source: 'Finanças BR'
    }
  ];
}

// ===== ENDPOINT PRINCIPAL =====
router.get('/indicators', async (req, res) => {
  try {
    const [selic, ipca, dollar, crypto, news] = await Promise.all([
      getSelic(),
      getIPCA(),
      getDollar(),
      getCryptoPrices(),
      getMarketNews()
    ]);
    
    res.json({
      success: true,
      updatedAt: new Date().toISOString(),
      indicators: {
        selic,
        ipca,
        dollar
      },
      crypto,
      news: news || []
    });
  } catch (error) {
    console.error('Erro ao buscar indicadores:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar indicadores' });
  }
});

module.exports = router;