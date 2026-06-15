const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

function calculateSimulation(targetAmount, monthlyContribution, currentSaved = 0) {
  if (monthlyContribution <= 0) return { monthsNeeded: null, totalNeeded: targetAmount - currentSaved };
  
  const remaining = targetAmount - currentSaved;
  const monthsNeeded = Math.ceil(remaining / monthlyContribution);
  const years = Math.floor(monthsNeeded / 12);
  const months = monthsNeeded % 12;
  
  return {
    remaining,
    monthsNeeded,
    years,
    months,
    monthlyContribution,
    formattedTime: years > 0 ? `${years} ano(s) e ${months} mes(es)` : `${months} mes(es)`
  };
}

router.get('/', async (req, res) => {
  try {
    const { data: dreams, error } = await supabase
      .from('dream_simulator')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const dreamsWithSimulation = (dreams || []).map(dream => ({
      ...dream,
      simulation: calculateSimulation(dream.target_amount, dream.monthly_contribution, dream.current_saved)
    }));
    
    res.json({ dreams: dreamsWithSimulation });
  } catch (error) {
    console.error('Get dreams error:', error);
    res.status(500).json({ error: 'Erro ao buscar sonhos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, target_amount, monthly_contribution, current_saved = 0, deadline } = req.body;
    
    if (!name || !target_amount) {
      return res.status(400).json({ error: 'Nome e valor alvo são obrigatórios' });
    }
    
    const { data, error } = await supabase
      .from('dream_simulator')
      .insert({
        user_id: req.userId,
        name,
        target_amount,
        monthly_contribution: monthly_contribution || null,
        current_saved,
        deadline: deadline || null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const simulation = calculateSimulation(target_amount, monthly_contribution, current_saved);
    
    res.status(201).json({ ...data, simulation });
  } catch (error) {
    console.error('Create dream error:', error);
    res.status(500).json({ error: 'Erro ao criar sonho' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { monthly_contribution, current_saved } = req.body;
    
    const { data: dream, error: findError } = await supabase
      .from('dream_simulator')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();
    
    if (findError) return res.status(404).json({ error: 'Sonho não encontrado' });
    
    const updates = {};
    if (monthly_contribution !== undefined) updates.monthly_contribution = monthly_contribution;
    if (current_saved !== undefined) updates.current_saved = current_saved;
    updates.updated_at = new Date();
    
    const { data, error } = await supabase
      .from('dream_simulator')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();
    
    if (error) throw error;
    
    const simulation = calculateSimulation(dream.target_amount, data.monthly_contribution, data.current_saved);
    
    res.json({ ...data, simulation });
  } catch (error) {
    console.error('Update dream error:', error);
    res.status(500).json({ error: 'Erro ao atualizar sonho' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('dream_simulator')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Delete dream error:', error);
    res.status(500).json({ error: 'Erro ao deletar sonho' });
  }
});

module.exports = router;