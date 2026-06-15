const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Registrar evento na timeline
async function addTimelineEvent(userId, eventType, title, description, oldValue = null, newValue = null, score = null) {
  try {
    await supabase
      .from('financial_timeline')
      .insert({
        user_id: userId,
        event_type: eventType,
        title,
        description,
        old_value: oldValue,
        new_value: newValue,
        score,
        event_date: new Date()
      });
  } catch (err) {
    console.error('Erro ao registrar timeline:', err);
  }
}

// Buscar timeline do usuário
router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const { data: events, error } = await supabase
      .from('financial_timeline')
      .select('*')
      .eq('user_id', req.userId)
      .order('event_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    // Agrupar por mês para visualização
    const groupedByMonth = {};
    (events || []).forEach(event => {
      const month = new Date(event.event_date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (!groupedByMonth[month]) groupedByMonth[month] = [];
      groupedByMonth[month].push(event);
    });
    
    res.json({ timeline: events, grouped: groupedByMonth });
  } catch (err) {
    console.error('Get timeline error:', err);
    res.status(500).json({ error: 'Erro ao buscar timeline' });
  }
});

module.exports = { router, addTimelineEvent };