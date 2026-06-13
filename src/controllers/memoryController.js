const supabase = require('../db/supabase');

const memoryController = {
  // Salvar memória da conversa
  async saveMemory(req, res) {
    try {
      const { key, value, confidence = 0.8 } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ error: 'Key e value são obrigatórios' });
      }
      
      const { data, error } = await supabase
        .from('conversation_memory')
        .upsert({
          user_id: req.userId,
          key,
          value,
          confidence,
          last_updated: new Date()
        }, { onConflict: 'user_id,key' })
        .select()
        .single();
      
      if (error) throw error;
      res.json({ success: true, memory: data });
    } catch (err) {
      console.error('Save memory error:', err);
      res.status(500).json({ error: 'Erro ao salvar memória' });
    }
  },

  // Buscar todas as memórias do usuário
  async getMemories(req, res) {
    try {
      const { data, error } = await supabase
        .from('conversation_memory')
        .select('key, value, confidence, last_updated')
        .eq('user_id', req.userId)
        .order('last_updated', { ascending: false });
      
      if (error) throw error;
      
      // Converter para objeto
      const memories = {};
      (data || []).forEach(m => { memories[m.key] = m.value; });
      
      res.json({ memories, list: data });
    } catch (err) {
      console.error('Get memories error:', err);
      res.status(500).json({ error: 'Erro ao buscar memórias' });
    }
  },

  // Deletar uma memória específica
  async deleteMemory(req, res) {
    try {
      const { key } = req.params;
      
      const { error } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('user_id', req.userId)
        .eq('key', key);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('Delete memory error:', err);
      res.status(500).json({ error: 'Erro ao deletar memória' });
    }
  },
  
  // Limpar todas as memórias do usuário
  async clearMemories(req, res) {
    try {
      const { error } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('user_id', req.userId);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('Clear memories error:', err);
      res.status(500).json({ error: 'Erro ao limpar memórias' });
    }
  }
};

module.exports = memoryController;