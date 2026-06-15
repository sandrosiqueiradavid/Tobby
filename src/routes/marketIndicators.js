const express = require('express');
const router = express.Router();

// Cache para não sobrecarregar APIs
let cache = {};
let lastUpdate = null;

async function fetchWithCache(url, key, ttl = 3600000) { // 1 hora
  if (cache[key] && lastUpdate && (Date.now() - lastUpdate) < ttl) {
    return cache[key];
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    cache[key] = data;
    lastUpdate = Date.now();
    return data;
  } catch (error) {
    console.error(`Erro ao buscar ${key}:`, error);
    return cache[key] || null;
  }
}

router.get('/', async (req, res) => {
  try {
    const [selic, ipca, dollar, bitcoin] = await Promise.all([
      fetchWithCache('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json', 'selic'),
      fetchWithCache('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json', 'ipca'),
      fetchWithCache('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json', 'dollar'),
      fetchWithCache('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl', 'bitcoin')
    ]);
    
    const indicators = {
      updated_at: new Date().toISOString(),
      selic: selic && selic.length > 0 ? parseFloat(selic[selic.length - 1].valor).toFixed(2) : '--',
      ipca: ipca && ipca.length > 0 ? parseFloat(ipca[ipca.length - 1].valor).toFixed(2) : '--',
      dollar: dollar && dollar.length > 0 ? parseFloat(dollar[dollar.length - 1].valor).toFixed(2) : '--',
      bitcoin: bitcoin?.bitcoin?.brl ? `R$ ${bitcoin.bitcoin.brl.toLocaleString('pt-BR')}` : '--'
    };
    
    res.json(indicators);
  } catch (error) {
    console.error('Erro ao buscar indicadores:', error);
    res.status(500).json({ error: 'Erro ao buscar indicadores' });
  }
});

module.exports = router;