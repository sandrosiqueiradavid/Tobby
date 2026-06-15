const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Salvar memória da conversa
router.post('/', async (req, res) => {
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
    
    // Registrar auditoria
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'MEMORY_SAVED',
        table_name: 'conversation_memory',
        new_value: { key, value }
      });
    
    res.json({ success: true, memory: data });
  } catch (err) {
    console.error('Save memory error:', err);
    res.status(500).json({ error: 'Erro ao salvar memória' });
  }
});

// Buscar todas as memórias
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversation_memory')
      .select('key, value, confidence, last_updated')
      .eq('user_id', req.userId)
      .order('last_updated', { ascending: false });
    
    if (error) throw error;
    
    const memories = {};
    (data || []).forEach(m => { memories[m.key] = m.value; });
    
    res.json({ memories, list: data });
  } catch (err) {
    console.error('Get memories error:', err);
    res.status(500).json({ error: 'Erro ao buscar memórias' });
  }
});

// Buscar uma memória específica
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data, error } = await supabase
      .from('conversation_memory')
      .select('value')
      .eq('user_id', req.userId)
      .eq('key', key)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.json({ key, value: data?.value || null });
  } catch (err) {
    console.error('Get memory error:', err);
    res.status(500).json({ error: 'Erro ao buscar memória' });
  }
});

// Deletar uma memória
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const { error } = await supabase
      .from('conversation_memory')
      .delete()
      .eq('user_id', req.userId)
      .eq('key', key);
    
    if (error) throw error;
    
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'MEMORY_DELETED',
        table_name: 'conversation_memory',
        old_value: { key }
      });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete memory error:', err);
    res.status(500).json({ error: 'Erro ao deletar memória' });
  }
});

// Limpar todas as memórias
router.delete('/', async (req, res) => {
  try {
    const { error } = await supabase
      .from('conversation_memory')
      .delete()
      .eq('user_id', req.userId);
    
    if (error) throw error;
    
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'MEMORY_CLEARED',
        table_name: 'conversation_memory'
      });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Clear memories error:', err);
    res.status(500).json({ error: 'Erro ao limpar memórias' });
  }
});

module.exports = router;