const supabase = require('../db/supabase');

const dreamCenterController = {
  // ===== LISTAR SONHOS =====
  async getDreams(req, res) {
    try {
      const { status, category } = req.query;
      let query = supabase
        .from('dream_center')
        .select('*')
        .eq('user_id', req.userId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      if (error) throw error;

      // Calcular progresso e previsão para cada sonho
      const dreamsWithProgress = (data || []).map(dream => {
        const progress = dream.target_value > 0 
          ? (dream.current_value / dream.target_value) * 100 
          : 0;
        
        let forecast = null;
        if (dream.monthly_contribution > 0 && dream.target_value > dream.current_value) {
          const remaining = dream.target_value - dream.current_value;
          const monthsNeeded = Math.ceil(remaining / dream.monthly_contribution);
          forecast = {
            monthsNeeded,
            completionDate: new Date(Date.now() + monthsNeeded * 30 * 24 * 60 * 60 * 1000)
          };
        }

        return {
          ...dream,
          progress: Math.min(progress, 100),
          forecast
        };
      });

      res.json({ success: true, data: dreamsWithProgress });
    } catch (err) {
      console.error('Get dreams error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== CRIAR SONHO =====
  async createDream(req, res) {
    try {
      const { title, description, category, target_value, current_value = 0, monthly_contribution = 0, target_date, priority = 1 } = req.body;

      if (!title || !target_value) {
        return res.status(400).json({ error: 'Título e valor alvo são obrigatórios' });
      }

      const { data, error } = await supabase
        .from('dream_center')
        .insert({
          user_id: req.userId,
          title,
          description,
          category: category || 'outros',
          target_value,
          current_value,
          monthly_contribution,
          target_date,
          priority,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar na memória do Tobby
      await supabase
        .from('tobby_memory')
        .insert({
          user_id: req.userId,
          memory_type: 'dream',
          memory_text: `Quer realizar o sonho: ${title}`,
          importance: 3,
          source: 'dream_center'
        });

      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('Create dream error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== ATUALIZAR SONHO =====
  async updateDream(req, res) {
    try {
      const { id } = req.params;
      const { title, description, category, target_value, current_value, monthly_contribution, target_date, priority, status } = req.body;

      const updateData = { updated_at: new Date() };
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (target_value !== undefined) updateData.target_value = target_value;
      if (current_value !== undefined) updateData.current_value = current_value;
      if (monthly_contribution !== undefined) updateData.monthly_contribution = monthly_contribution;
      if (target_date !== undefined) updateData.target_date = target_date;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;

      const { data, error } = await supabase
        .from('dream_center')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error('Update dream error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== ATUALIZAR PROGRESSO =====
  async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { current_value } = req.body;

      if (current_value === undefined) {
        return res.status(400).json({ error: 'Valor atual é obrigatório' });
      }

      const { data: dream } = await supabase
        .from('dream_center')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (!dream) {
        return res.status(404).json({ error: 'Sonho não encontrado' });
      }

      const newProgress = (current_value / dream.target_value) * 100;
      const status = newProgress >= 100 ? 'completed' : 'active';

      const { data, error } = await supabase
        .from('dream_center')
        .update({ 
          current_value, 
          status,
          updated_at: new Date() 
        })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;

      // Se completou, registrar conquista
      if (status === 'completed') {
        await checkAndAwardAchievement(req.userId, 'goal_completed');
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error('Update progress error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== DELETAR SONHO =====
  async deleteDream(req, res) {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('dream_center')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('Delete dream error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== GERAR INSIGHTS DOS SONHOS =====
  async getInsights(req, res) {
    try {
      const { data: dreams } = await supabase
        .from('dream_center')
        .select('*')
        .eq('user_id', req.userId)
        .eq('status', 'active');

      if (!dreams || dreams.length === 0) {
        return res.json({ success: true, data: { message: 'Nenhum sonho ativo' } });
      }

      const totalTarget = dreams.reduce((s, d) => s + d.target_value, 0);
      const totalCurrent = dreams.reduce((s, d) => s + d.current_value, 0);
      const totalProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

      const closestDream = dreams.reduce((a, b) => {
        const progressA = (a.current_value / a.target_value) * 100;
        const progressB = (b.current_value / b.target_value) * 100;
        return progressA > progressB ? a : b;
      }, dreams[0]);

      const farthestDream = dreams.reduce((a, b) => {
        const progressA = (a.current_value / a.target_value) * 100;
        const progressB = (b.current_value / b.target_value) * 100;
        return progressA < progressB ? a : b;
      }, dreams[0]);

      res.json({
        success: true,
        data: {
          totalDreams: dreams.length,
          totalTarget,
          totalCurrent,
          totalProgress: Math.min(totalProgress, 100),
          closestDream: {
            title: closestDream.title,
            progress: ((closestDream.current_value / closestDream.target_value) * 100).toFixed(1)
          },
          farthestDream: {
            title: farthestDream.title,
            progress: ((farthestDream.current_value / farthestDream.target_value) * 100).toFixed(1)
          }
        }
      });
    } catch (err) {
      console.error('Dream insights error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

// Função auxiliar para conquistas
async function checkAndAwardAchievement(userId, type) {
  // Implementação simplificada
  console.log(`🏆 Conquista ${type} para usuário ${userId}`);
}

module.exports = dreamCenterController;