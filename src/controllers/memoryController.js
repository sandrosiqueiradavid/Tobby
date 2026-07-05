// src/controllers/memoryController.js
const supabase = require('../db/supabase');

const memoryController = {
  // ===== LISTAR MEMÓRIAS RELEVANTES =====
  async getRelevantMemories(req, res) {
    try {
      const { limit = 10, importance = 3 } = req.query;

      console.log(`[MEMORY] 📖 Buscando memórias relevantes para usuário ${req.userId}`);

      const { data, error } = await supabase
        .from('tobby_memory')
        .select('*')
        .eq('user_id', req.userId)
        .gte('importance', parseInt(importance))
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;

      console.log(`[MEMORY] ✅ ${data?.length || 0} memórias relevantes encontradas`);

      res.json({ 
        success: true, 
        data: data || [],
        count: data?.length || 0
      });
    } catch (err) {
      console.error('[MEMORY] ❌ Get memories error:', err);
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

      if (text.length < 10) {
        return res.status(400).json({ error: 'Texto muito curto para extrair memórias' });
      }

      console.log(`[MEMORY] 🔍 Extraindo memórias do texto para usuário ${req.userId}`);

      // Analisar texto para extrair memórias
      const memories = await extractMemoriesFromText(text);

      if (memories.length === 0) {
        console.log('[MEMORY] ℹ️ Nenhuma memória relevante identificada');
        return res.json({ 
          success: true, 
          message: 'Nenhuma memória relevante identificada',
          extracted: 0
        });
      }

      const savedMemories = [];
      let skippedCount = 0;

      for (const memory of memories) {
        // Verificar se já existe uma memória similar
        const { data: existing } = await supabase
          .from('tobby_memory')
          .select('id')
          .eq('user_id', req.userId)
          .eq('memory_text', memory.text)
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        const { data, error } = await supabase
          .from('tobby_memory')
          .insert({
            user_id: req.userId,
            memory_type: memory.type,
            memory_text: memory.text,
            importance: memory.importance || 2,
            source: source,
            context: memory.context || null,
            created_at: new Date()
          })
          .select()
          .single();

        if (!error && data) {
          savedMemories.push(data);
        }
      }

      console.log(`[MEMORY] ✅ ${savedMemories.length} memórias salvas (${skippedCount} duplicatas ignoradas)`);

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MEMORY_EXTRACTED',
          table_name: 'tobby_memory',
          new_value: { 
            extracted: savedMemories.length,
            source: source,
            skipped: skippedCount
          }
        });

      res.status(201).json({ 
        success: true, 
        data: savedMemories,
        extracted: savedMemories.length,
        skipped: skippedCount,
        message: `${savedMemories.length} memórias extraídas com sucesso`
      });
    } catch (err) {
      console.error('[MEMORY] ❌ Extract memory error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== HISTÓRICO DE MEMÓRIAS =====
  async getMemoryHistory(req, res) {
    try {
      const { type, startDate, endDate, limit = 50 } = req.query;

      console.log(`[MEMORY] 📜 Buscando histórico para usuário ${req.userId}`);

      let query = supabase
        .from('tobby_memory')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (type) query = query.eq('memory_type', type);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por tipo
      const grouped = {};
      const typeCounts = {};
      (data || []).forEach(m => {
        if (!grouped[m.memory_type]) {
          grouped[m.memory_type] = [];
          typeCounts[m.memory_type] = 0;
        }
        grouped[m.memory_type].push(m);
        typeCounts[m.memory_type]++;
      });

      // Ordenar grupos por quantidade
      const sortedTypes = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);

      console.log(`[MEMORY] ✅ ${data?.length || 0} memórias encontradas`);

      res.json({ 
        success: true, 
        data: data || [],
        grouped,
        typeCounts,
        sortedTypes,
        total: data?.length || 0
      });
    } catch (err) {
      console.error('[MEMORY] ❌ Memory history error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== RECORDAR MEMÓRIA =====
  async recallMemory(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da memória é obrigatório' });
      }

      console.log(`[MEMORY] 🔔 Recordando memória ${id} para usuário ${req.userId}`);

      const { data, error } = await supabase
        .from('tobby_memory')
        .update({ recalled_at: new Date() })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Memória não encontrada' });
        }
        throw error;
      }

      console.log(`[MEMORY] ✅ Memória ${id} recordada com sucesso`);

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MEMORY_RECALLED',
          table_name: 'tobby_memory',
          new_value: { 
            memory_id: id,
            memory_type: data.memory_type,
            memory_text: data.memory_text.substring(0, 50) + '...'
          }
        });

      res.json({ 
        success: true, 
        data,
        message: 'Memória recordada com sucesso'
      });
    } catch (err) {
      console.error('[MEMORY] ❌ Recall memory error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== DELETAR MEMÓRIA =====
  async deleteMemory(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da memória é obrigatório' });
      }

      console.log(`[MEMORY] 🗑️ Deletando memória ${id} para usuário ${req.userId}`);

      // Buscar a memória antes de deletar para auditoria
      const { data: existing } = await supabase
        .from('tobby_memory')
        .select('memory_type, memory_text')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (!existing) {
        return res.status(404).json({ error: 'Memória não encontrada' });
      }

      const { error } = await supabase
        .from('tobby_memory')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) throw error;

      console.log(`[MEMORY] ✅ Memória ${id} deletada com sucesso`);

      // Registrar no audit_log
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MEMORY_DELETED',
          table_name: 'tobby_memory',
          old_value: { 
            memory_id: id,
            memory_type: existing.memory_type,
            memory_text: existing.memory_text.substring(0, 50) + '...'
          }
        });

      res.json({ 
        success: true, 
        message: 'Memória deletada com sucesso' 
      });
    } catch (err) {
      console.error('[MEMORY] ❌ Delete memory error:', err);
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
    },
    // Padrões adicionais
    {
      regex: /quero muito (.+?)(\.|$)/i,
      type: 'dream',
      importance: 4,
      extract: (m) => `Quer muito ${m[1]}`
    },
    {
      regex: /não gosto de (.+?)(\.|$)/i,
      type: 'preference',
      importance: 2,
      extract: (m) => `Não gosta de ${m[1]}`
    },
    {
      regex: /preciso de ajuda com (.+?)(\.|$)/i,
      type: 'concern',
      importance: 4,
      extract: (m) => `Precisa de ajuda com ${m[1]}`
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