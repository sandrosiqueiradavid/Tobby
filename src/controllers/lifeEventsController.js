// src/controllers/lifeEventsController.js
const supabase = require('../db/supabase');

const lifeEventsController = {
  // ===== LISTAR EVENTOS =====
  async getEvents(req, res) {
    try {
      const { category, year } = req.query;
      let query = supabase
        .from('life_events')
        .select('*')
        .eq('user_id', req.userId)
        .order('event_date', { ascending: false });

      if (category) query = query.eq('category', category);
      if (year) query = query.gte('event_date', `${year}-01-01`).lte('event_date', `${year}-12-31`);

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por ano
      const grouped = {};
      (data || []).forEach(event => {
        const year = new Date(event.event_date).getFullYear();
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(event);
      });

      res.json({ success: true, data: data || [], grouped });
    } catch (err) {
      console.error('Life events error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== CRIAR EVENTO =====
  async createEvent(req, res) {
    try {
      const { event_date, title, description, category = 'other' } = req.body;
      
      if (!event_date || !title) {
        return res.status(400).json({ error: 'Data e título são obrigatórios' });
      }

      const { data, error } = await supabase
        .from('life_events')
        .insert({
          user_id: req.userId,
          event_date,
          title,
          description,
          category,
          created_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Create life event error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== ATUALIZAR EVENTO =====
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const { event_date, title, description, category } = req.body;

      const { data, error } = await supabase
        .from('life_events')
        .update({ event_date, title, description, category, updated_at: new Date() })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error('Update life event error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== DELETAR EVENTO =====
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('life_events')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('Delete life event error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = lifeEventsController;