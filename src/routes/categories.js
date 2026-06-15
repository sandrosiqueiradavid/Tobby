const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Listar categorias do usuário (inclui padrões)
router.get('/', async (req, res) => {
  try {
    const { data: defaultCategories } = await supabase
      .from('categories')
      .select('*')
      .is('user_id', null)
      .order('name');
    
    const { data: userCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', req.userId)
      .order('name');
    
    const categories = [...(defaultCategories || []), ...(userCategories || [])];
    
    res.json({ categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Criar categoria personalizada
router.post('/', async (req, res) => {
  try {
    const { name, emoji, color, parent_category } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
    }
    
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', req.userId)
      .eq('name', name)
      .single();
    
    if (existing) {
      return res.status(400).json({ error: 'Você já possui uma categoria com este nome' });
    }
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: req.userId,
        name,
        emoji: emoji || '📦',
        color: color || '#6B7280',
        parent_category: parent_category || 'custom',
        is_default: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'CATEGORY_CREATED',
        table_name: 'categories',
        new_value: { name, emoji, color }
      });
    
    res.status(201).json(data);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// Atualizar categoria
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji, color, parent_category } = req.body;
    
    const { data: category } = await supabase
      .from('categories')
      .select('is_default')
      .eq('id', id)
      .single();
    
    if (category?.is_default) {
      return res.status(400).json({ error: 'Não é possível editar categorias padrão' });
    }
    
    const { data, error } = await supabase
      .from('categories')
      .update({
        name,
        emoji,
        color,
        parent_category: parent_category || 'custom',
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();
    
    if (error) return res.status(404).json({ error: 'Categoria não encontrada' });
    
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'CATEGORY_UPDATED',
        table_name: 'categories',
        old_value: { name: category?.name },
        new_value: { name }
      });
    
    res.json(data);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// Deletar categoria
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: category } = await supabase
      .from('categories')
      .select('name, is_default')
      .eq('id', id)
      .single();
    
    if (category?.is_default) {
      return res.status(400).json({ error: 'Não é possível deletar categorias padrão' });
    }
    
    // Atualizar contas que usam esta categoria para 'outros'
    const { error: updateError } = await supabase
      .from('bills')
      .update({ category: 'outros' })
      .eq('user_id', req.userId)
      .eq('category', category.name);
    
    if (updateError) {
      console.error('Erro ao atualizar contas:', updateError);
    }
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);
    
    if (error) throw error;
    
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'CATEGORY_DELETED',
        table_name: 'categories',
        old_value: { name: category?.name }
      });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

module.exports = router;