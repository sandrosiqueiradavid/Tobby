const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Registrar subscription para push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription é obrigatória' });
    }
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: req.userId,
        subscription: subscription,
        updated_at: new Date()
      }, { onConflict: 'user_id' });
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Erro ao registrar notificações' });
  }
});

// Testar notificação
router.post('/test', async (req, res) => {
  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', req.userId);
    
    if (!subscriptions || subscriptions.length === 0) {
      return res.json({ message: 'Nenhuma subscription encontrada' });
    }
    
    // Aqui você implementaria o envio via web-push
    // Por enquanto, apenas registra
    await supabase
      .from('audit_log')
      .insert({
        user_id: req.userId,
        action: 'PUSH_TEST',
        table_name: 'push_subscriptions'
      });
    
    res.json({ message: 'Teste de notificação enviado' });
  } catch (err) {
    console.error('Test notification error:', err);
    res.status(500).json({ error: 'Erro ao testar notificação' });
  }
});

// Buscar contas próximas do vencimento e enviar notificações
async function checkAndSendNotifications() {
  try {
    const today = new Date().getDate();
    const tomorrow = today + 1;
    
    const { data: bills, error } = await supabase
      .from('bills')
      .select('id, name, value_encrypted, due_day, user_id')
      .eq('status', 'pending')
      .in('due_day', [today, tomorrow]);
    
    if (error) throw error;
    
    for (const bill of bills) {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', bill.user_id);
      
      if (subscriptions && subscriptions.length > 0) {
        // Aqui enviaria a notificação push real
        console.log(`🔔 Notificação para conta: ${bill.name} vence dia ${bill.due_day}`);
      }
    }
  } catch (err) {
    console.error('Check notifications error:', err);
  }
}

// Agendar verificação diária
if (process.env.NODE_ENV === 'production') {
  setInterval(checkAndSendNotifications, 24 * 60 * 60 * 1000);
  console.log('🔔 Sistema de notificações push iniciado');
}

module.exports = { router, checkAndSendNotifications };