const supabase = require('../db/supabase');

const memoryController = {
  // ===== LISTAR MEMÓRIAS RELEVANTES =====
  async getRelevantMemories(req, res) {
    try {
      const { limit = 10, importance = 3 } = req.query;

      const { data, error } = await supabase
        .from('tobby_memory')
        .select('*')
        .eq('user_id', req.userId)
        .gte('importance', parseInt(importance))
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('Get memories error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== EXTRAIR MEMÓRIA DA CONVERSA =====
  async extractMemory(req, res) {
    try {
      const { text, source = 'chat' } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texto é obrigatório' });
      }

      // Analisar texto para extrair memórias
      const memories = await extractMemoriesFromText(text);

      if (memories.length === 0) {
        return res.json({ success: true, message: 'Nenhuma memória relevante identificada' });
      }

      const savedMemories = [];
      for (const memory of memories) {
        const { data, error } = await supabase
          .from('tobby_memory')
          .insert({
            user_id: req.userId,
            memory_type: memory.type,
            memory_text: memory.text,
            importance: memory.importance || 2,
            source: source,
            context: memory.context || null
          })
          .select()
          .single();

        if (!error) savedMemories.push(data);
      }

      res.status(201).json({ success: true, data: savedMemories });
    } catch (err) {
      console.error('Extract memory error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== HISTÓRICO DE MEMÓRIAS =====
  async getMemoryHistory(req, res) {
    try {
      const { type, startDate, endDate } = req.query;
      let query = supabase
        .from('tobby_memory')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });

      if (type) query = query.eq('memory_type', type);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por tipo
      const grouped = {};
      (data || []).forEach(m => {
        if (!grouped[m.memory_type]) grouped[m.memory_type] = [];
        grouped[m.memory_type].push(m);
      });

      res.json({ success: true, data: data || [], grouped });
    } catch (err) {
      console.error('Memory history error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== RECORDAR MEMÓRIA =====
  async recallMemory(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('tobby_memory')
        .update({ recalled_at: new Date() })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error('Recall memory error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== DELETAR MEMÓRIA =====
  async deleteMemory(req, res) {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('tobby_memory')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('Delete memory error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// ===== FUNÇÃO AUXILIAR: EXTRAIR MEMÓRIAS DO TEXTO =====
async function extractMemoriesFromText(text) {
  const memories = [];
  const patterns = [
    {
      regex: /quero (comprar|ter|fazer|viajar para|conquistar) (.+?)(\.|$)/i,
      type: 'goal',
      importance: 4,
      extract: (m) => `Quer ${m[1]} ${m[2]}`
    },
    {
      regex: /sonho em (comprar|ter|fazer|viajar para) (.+?)(\.|$)/i,
      type: 'dream',
      importance: 5,
      extract: (m) => `Sonha em ${m[1]} ${m[2]}`
    },
    {
      regex: /estou preocupado com (.+?)(\.|$)/i,
      type: 'concern',
      importance: 4,
      extract: (m) => `Preocupado com ${m[1]}`
    },
    {
      regex: /gosto de (.+?)(\.|$)/i,
      type: 'preference',
      importance: 2,
      extract: (m) => `Gosta de ${m[1]}`
    },
    {
      regex: /meu objetivo é (.+?)(\.|$)/i,
      type: 'goal',
      importance: 4,
      extract: (m) => `Objetivo: ${m[1]}`
    },
    {
      regex: /quando eu era (criança|jovem|mais novo) (.+?)(\.|$)/i,
      type: 'life_event',
      importance: 3,
      extract: (m) => `Quando era ${m[1]}: ${m[2]}`
    },
    {
      regex: /eu (amo|adoro) (.+?)(\.|$)/i,
      type: 'preference',
      importance: 3,
      extract: (m) => `Ama ${m[2]}`
    },
    {
      regex: /meu maior medo é (.+?)(\.|$)/i,
      type: 'concern',
      importance: 5,
      extract: (m) => `Maior medo: ${m[1]}`
    },
    {
      regex: /conquistei (.+?)(\.|$)/i,
      type: 'achievement',
      importance: 4,
      extract: (m) => `Conquistou ${m[1]}`
    },
    {
      regex: /(casamento|formatura|promoção|nascimento) (.+?)(\.|$)/i,
      type: 'life_event',
      importance: 4,
      extract: (m) => `${m[1]}: ${m[2]}`
    }
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      memories.push({
        type: pattern.type,
        text: pattern.extract(match),
        importance: pattern.importance,
        context: { original: match[0] }
      });
    }
  }

  // Evitar duplicatas
  const unique = [];
  const seen = new Set();
  for (const mem of memories) {
    if (!seen.has(mem.text)) {
      seen.add(mem.text);
      unique.push(mem);
    }
  }

  return unique;
}

module.exports = memoryController;