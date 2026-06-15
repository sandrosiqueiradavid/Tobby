const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

let marketCache = null;
let lastUpdate = null;
const CACHE_TTL = 3600000;

async function getMarketIndicators() {
  const now = Date.now();
  if (marketCache && lastUpdate && (now - lastUpdate) < CACHE_TTL) {
    return marketCache;
  }
  
  try {
    const [selicRes, ipcaRes, dollarRes, btcRes] = await Promise.all([
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json'),
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json'),
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json'),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl')
    ]);
    
    const selicData = await selicRes.json();
    const ipcaData = await ipcaRes.json();
    const dollarData = await dollarRes.json();
    const btcData = await btcRes.json();
    
    marketCache = {
      selic: selicData[selicData.length - 1]?.valor || '13.25',
      ipca: ipcaData[ipcaData.length - 1]?.valor || '4.50',
      dollar: dollarData[dollarData.length - 1]?.valor || '5.75',
      bitcoin: btcData.bitcoin?.brl || 350000,
      updated_at: new Date().toISOString()
    };
    lastUpdate = now;
  } catch (error) {
    console.error('Erro ao buscar indicadores:', error);
    if (!marketCache) {
      marketCache = { selic: '13.25', ipca: '4.50', dollar: '5.75', bitcoin: 350000, updated_at: new Date().toISOString() };
    }
  }
  return marketCache;
}

async function checkAndCreateAlerts(userId) {
  const current = await getMarketIndicators();
  
  const { data: previousAlerts } = await supabase
    .from('radar_alerts')
    .select('alert_type')
    .eq('user_id', userId)
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  const recentAlertTypes = new Set(previousAlerts?.map(a => a.alert_type) || []);
  const newAlerts = [];
  
  if (!recentAlertTypes.has('selic_change')) {
    newAlerts.push({
      user_id: userId,
      alert_type: 'selic_change',
      title: '📊 Taxa Selic',
      message: `A Selic está em ${current.selic}% ao ano. Isso afeta diretamente seus investimentos em renda fixa.`,
      severity: 'info'
    });
  }
  
  if (!recentAlertTypes.has('bitcoin_change')) {
    newAlerts.push({
      user_id: userId,
      alert_type: 'bitcoin_change',
      title: '₿ Bitcoin',
      message: `Bitcoin está cotado a R$ ${current.bitcoin.toLocaleString('pt-BR')}. O mercado de criptomoedas continua volátil.`,
      severity: 'info'
    });
  }
  
  if (newAlerts.length > 0) {
    const { error } = await supabase.from('radar_alerts').insert(newAlerts);
    if (error) console.error('Erro ao criar alertas:', error);
  }
  
  return newAlerts;
}

router.get('/', async (req, res) => {
  try {
    const indicators = await getMarketIndicators();
    await checkAndCreateAlerts(req.userId);
    
    const { data: alerts, error } = await supabase
      .from('radar_alerts')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    res.json({ indicators, alerts });
  } catch (error) {
    console.error('Radar error:', error);
    res.status(500).json({ error: 'Erro ao carregar radar financeiro' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('radar_alerts')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.userId);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar alerta como lido' });
  }
});

module.exports = router;