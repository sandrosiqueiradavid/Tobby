const supabase = require('../db/supabase');
const AIService = require('../services/aiService');
const aiService = new AIService();

const journalController = {
  // ===== LISTAR REGISTROS =====
  async getEntries(req, res) {
    try {
      const { startDate, endDate } = req.query;
      let query = supabase
        .from('financial_journal')
        .select('*')
        .eq('user_id', req.userId)
        .order('entry_date', { ascending: false });

      if (startDate) query = query.gte('entry_date', startDate);
      if (endDate) query = query.lte('entry_date', endDate);

      const { data, error } = await query;
      if (error) throw error;

      res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('Journal error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== CRIAR REGISTRO =====
  async createEntry(req, res) {
    try {
      const { text, mood = 'neutral', entry_date } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Texto é obrigatório' });
      }

      // Analisar com IA
      const analysis = await aiService.analyzeJournal(text, mood);

      const { data, error } = await supabase
        .from('financial_journal')
        .insert({
          user_id: req.userId,
          text,
          mood,
          entry_date: entry_date || new Date().toISOString().split('T')[0],
          emotions: analysis.emotions,
          analysis: analysis,
          created_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar na linha do tempo
      await supabase
        .from('financial_timeline')
        .insert({
          user_id: req.userId,
          event_type: 'journal_entry',
          title: 'Registro no Diário',
          description: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        });

      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Create journal error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== ANALISAR REGISTRO =====
  async analyzeEntry(req, res) {
    try {
      const { id } = req.params;
      
      const { data: entry } = await supabase
        .from('financial_journal')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (!entry) {
        return res.status(404).json({ error: 'Registro não encontrado' });
      }

      const analysis = await aiService.analyzeJournal(entry.text, entry.mood);

      const { data, error } = await supabase
        .from('financial_journal')
        .update({ analysis, emotions: analysis.emotions })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, data });
    } catch (err) {
      console.error('Analyze journal error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== DELETAR REGISTRO =====
  async deleteEntry(req, res) {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('financial_journal')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('Delete journal error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = journalController;