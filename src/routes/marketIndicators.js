const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

let cache = {
  indicators: null,
  lastUpdate: null
};

const CACHE_TTL = 3600000;

async function fetchWithCache(url, key) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erro ao buscar ${key}:`, error);
    return null;
  }
}

async function getSelic() {
  const data = await fetchWithCache('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json', 'selic');
  if (data && data.length > 0) {
    return parseFloat(data[data.length - 1].valor).toFixed(2);
  }
  return '13.25';
}

async function getIPCA() {
  const data = await fetchWithCache('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json', 'ipca');
  if (data && data.length > 0) {
    return parseFloat(data[data.length - 1].valor).toFixed(2);
  }
  return '4.50';
}

async function getDollar() {
  const data = await fetchWithCache('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json', 'dollar');
  if (data && data.length > 0) {
    return parseFloat(data[data.length - 1].valor).toFixed(2);
  }
  return '5.75';
}

async function getBitcoin() {
  const data = await fetchWithCache('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl', 'bitcoin');
  if (data && data.bitcoin) {
    return data.bitcoin.brl;
  }
  return 350000;
}

async function getEthereum() {
  const data = await fetchWithCache('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=brl', 'ethereum');
  if (data && data.ethereum) {
    return data.ethereum.brl;
  }
  return 18000;
}

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    
    if (cache.indicators && cache.lastUpdate && (now - cache.lastUpdate) < CACHE_TTL) {
      return res.json(cache.indicators);
    }
    
    const [selic, ipca, dollar, bitcoin, ethereum] = await Promise.all([
      getSelic(),
      getIPCA(),
      getDollar(),
      getBitcoin(),
      getEthereum()
    ]);
    
    const indicators = {
      success: true,
      updated_at: new Date().toISOString(),
      selic: `${selic}%`,
      ipca: `${ipca}%`,
      dollar: `R$ ${dollar}`,
      bitcoin: `R$ ${bitcoin.toLocaleString('pt-BR')}`,
      ethereum: `R$ ${ethereum.toLocaleString('pt-BR')}`
    };
    
    cache.indicators = indicators;
    cache.lastUpdate = now;
    
    res.json(indicators);
  } catch (error) {
    console.error('Erro ao buscar indicadores:', error);
    res.status(500).json({ error: 'Erro ao buscar indicadores de mercado' });
  }
});

module.exports = router;