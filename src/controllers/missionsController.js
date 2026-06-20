const supabase = require('../db/supabase');
const AIService = require('../services/aiService');
const aiService = new AIService();

const missionsController = {
  // ===== LISTAR MISSÕES =====
  async getMissions(req, res) {
    try {
      const { status, week } = req.query;
      let query = supabase
        .from('weekly_missions')
        .select('*')
        .eq('user_id', req.userId)
        .order('week_start', { ascending: false });

      if (status) query = query.eq('status', status);
      if (week) query = query.eq('week_start', week);

      const { data, error } = await query;
      if (error) throw error;

      res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('Get missions error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== GERAR MISSÕES (IA) =====
  async generateMissions(req, res) {
    try {
      // Buscar dados do usuário
      const { data: user } = await supabase
        .from('users')
        .select('name, salary')
        .eq('id', req.userId)
        .single();

      const { data: bills } = await supabase
        .from('bills')
        .select('value_encrypted, category')
        .eq('user_id', req.userId);

      const { data: goals } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', req.userId)
        .eq('status', 'active');

      // Calcular gastos por categoria
      const categorySpending = {};
      (bills || []).forEach(b => {
        const value = decryptNumber(b.value_encrypted) || 0;
        const cat = b.category || 'outros';
        categorySpending[cat] = (categorySpending[cat] || 0) + value;
      });

      // Gerar missões via IA
      const missions = await generateMissionsFromAI(user, categorySpending, goals);

      // Salvar missões
      const weekStart = getWeekStart();
      const savedMissions = [];
      
      for (const mission of missions) {
        const { data, error } = await supabase
          .from('weekly_missions')
          .insert({
            user_id: req.userId,
            week_start: weekStart,
            title: mission.title,
            description: mission.description,
            goal_type: mission.goal_type,
            goal_value: mission.goal_value,
            status: 'pending'
          })
          .select()
          .single();

        if (!error) savedMissions.push(data);
      }

      res.status(201).json({ 
        success: true, 
        data: savedMissions,
        message: `${savedMissions.length} missões geradas para esta semana`
      });
    } catch (err) {
      console.error('Generate missions error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== ATUALIZAR PROGRESSO =====
  async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { progress, status } = req.body;

      const updateData = { progress };
      if (status) updateData.status = status;

      const { data, error } = await supabase
        .from('weekly_missions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error('Update mission progress error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== COMPLETAR MISSÃO =====
  async completeMission(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('weekly_missions')
        .update({ status: 'completed', progress: 100 })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;

      // Adicionar conquista
      await supabase
        .from('audit_log')
        .insert({
          user_id: req.userId,
          action: 'MISSION_COMPLETED',
          table_name: 'weekly_missions',
          new_value: { title: data.title }
        });

      res.json({ success: true, data });
    } catch (err) {
      console.error('Complete mission error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

async function generateMissionsFromAI(user, categorySpending, goals) {
  const prompt = `
Gere 3 missões financeiras semanais para o usuário.

Dados do usuário:
- Nome: ${user?.name || 'Usuário'}
- Salário: R$ ${user?.salary || 0}
- Gastos por categoria: ${JSON.stringify(categorySpending)}
- Metas ativas: ${goals?.length || 0}

Formato de resposta (JSON):
{
  "missions": [
    {
      "title": "Título curto",
      "description": "Descrição detalhada",
      "goal_type": "economia|redução|investimento|organização",
      "goal_value": 100
    }
  ]
}`;

  // Fallback se IA não estiver disponível
  const fallbackMissions = [
    {
      title: "Registre todos os gastos do dia",
      description: "Anote cada despesa para ter controle total",
      goal_type: "organização",
      goal_value: 0
    },
    {
      title: "Economize R$ 50 esta semana",
      description: "Evite compras por impulso",
      goal_type: "economia",
      goal_value: 50
    },
    {
      title: "Revise suas assinaturas",
      description: "Verifique se há serviços que você não usa mais",
      goal_type: "organização",
      goal_value: 0
    }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return parsed.missions || fallbackMissions;
  } catch (err) {
    console.error('AI mission generation error:', err);
    return fallbackMissions;
  }
}

module.exports = missionsController;