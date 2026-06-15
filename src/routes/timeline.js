const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

async function addTimelineEvent(userId, eventType, title, description, oldValue = null, newValue = null, score = null) {
  try {
    const { error } = await supabase
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
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao registrar timeline:', err);
    return false;
  }
}

router.get('/', async (req, res) => {
  try {
    const { limit = 50, event_type } = req.query;
    
    let query = supabase
      .from('financial_timeline')
      .select('*')
      .eq('user_id', req.userId)
      .order('event_date', { ascending: false })
      .limit(parseInt(limit));
    
    if (event_type) {
      query = query.eq('event_type', event_type);
    }
    
    const { data: events, error } = await query;
    
    if (error) throw error;
    
    const groupedByMonth = {};
    (events || []).forEach(event => {
      const month = new Date(event.event_date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (!groupedByMonth[month]) groupedByMonth[month] = [];
      groupedByMonth[month].push(event);
    });
    
    const summary = {
      total_events: events?.length || 0,
      score_changes: events?.filter(e => e.event_type === 'score_change').length || 0,
      goals_completed: events?.filter(e => e.event_type === 'goal_completed').length || 0,
      achievements: events?.filter(e => e.event_type === 'achievement').length || 0
    };
    
    res.json({ timeline: events, grouped: groupedByMonth, summary });
  } catch (err) {
    console.error('Get timeline error:', err);
    res.status(500).json({ error: 'Erro ao buscar linha do tempo' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { data: events } = await supabase
      .from('financial_timeline')
      .select('event_type, event_date, score')
      .eq('user_id', req.userId)
      .order('event_date', { ascending: true });
    
    const scoreEvolution = events
      ?.filter(e => e.event_type === 'score_change' && e.score)
      .map(e => ({ date: e.event_date, score: e.score })) || [];
    
    const milestones = events
      ?.filter(e => ['goal_completed', 'achievement'].includes(e.event_type))
      .slice(0, 5) || [];
    
    res.json({
      score_evolution: scoreEvolution,
      recent_milestones: milestones,
      total_events: events?.length || 0
    });
  } catch (err) {
    console.error('Get timeline summary error:', err);
    res.status(500).json({ error: 'Erro ao buscar resumo da linha do tempo' });
  }
});

// EXPORTAÇÃO CORRETA - apenas o router
module.exports = router;