// src/controllers/coupleController.js
const supabase = require('../db/supabase');

const coupleController = {
  // ===== CRIAR CASAL =====
  async createCouple(req, res) {
    try {
      const { partnerEmail } = req.body;
      
      if (!partnerEmail) {
        return res.status(400).json({ error: 'E-mail do parceiro é obrigatório' });
      }

      const { data: partner } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', partnerEmail)
        .single();

      if (!partner) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const { data: couple, error } = await supabase
        .from('couples')
        .insert({ created_by: req.userId })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('couple_members')
        .insert([
          { couple_id: couple.id, user_id: req.userId, role: 'admin', joined_at: new Date() },
          { couple_id: couple.id, user_id: partner.id, role: 'member' }
        ]);

      res.status(201).json({ 
        success: true, 
        data: couple,
        partner: { id: partner.id, name: partner.name, email: partner.email }
      });
    } catch (err) {
      console.error('Create couple error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== LISTAR CASAL =====
  async getCouple(req, res) {
    try {
      const { data: members } = await supabase
        .from('couple_members')
        .select('*, users(*)')
        .eq('user_id', req.userId)
        .single();

      if (!members) {
        return res.json({ success: true, data: null });
      }

      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .eq('id', members.couple_id)
        .single();

      const { data: allMembers } = await supabase
        .from('couple_members')
        .select('*, users(name, email)')
        .eq('couple_id', members.couple_id);

      res.json({
        success: true,
        data: {
          couple,
          members: allMembers || [],
          goals: []
        }
      });
    } catch (err) {
      console.error('Get couple error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== COMPARTILHAR META =====
  async shareGoal(req, res) {
    try {
      const { goal_id, contribution_percentage = 50 } = req.body;

      if (!goal_id) {
        return res.status(400).json({ error: 'ID da meta é obrigatório' });
      }

      const { data: member } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', req.userId)
        .single();

      if (!member) {
        return res.status(400).json({ error: 'Você não está em um casal' });
      }

      const { data, error } = await supabase
        .from('couple_goals')
        .insert({
          couple_id: member.couple_id,
          goal_id,
          contribution_percentage
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Share goal error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = coupleController;