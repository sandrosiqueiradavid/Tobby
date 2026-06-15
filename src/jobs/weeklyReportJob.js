const supabase = require('../db/supabase');
const { decryptNumber } = require('../utils/crypto');

async function generateWeeklySummary(userId, userEmail, userName, bills, salary) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);
  
  const paidThisWeek = bills.filter(b => {
    const billDate = new Date(b.created_at);
    return b.status === 'paid' && billDate >= weekStart;
  });
  
  const pendingBills = bills.filter(b => b.status === 'pending');
  const upcomingBills = pendingBills.filter(b => b.due_day >= today.getDate() && b.due_day <= today.getDate() + 7);
  
  const totalPaid = paidThisWeek.reduce((s, b) => s + (b.value || 0), 0);
  const totalUpcoming = upcomingBills.reduce((s, b) => s + (b.value || 0), 0);
  const freeBalance = salary - totalPaid;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22D07A, #4A9EFF); padding: 30px; text-align: center; border-radius: 20px;">
        <h1 style="color: white; margin: 0;">🐶 Tobby</h1>
        <p style="color: white; opacity: 0.9;">Seu resumo semanal</p>
      </div>
      
      <div style="padding: 20px;">
        <h2>Olá, ${userName}! 👋</h2>
        <p>Aqui está seu resumo financeiro da última semana:</p>
        
        <div style="background: #f4f4f4; padding: 15px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">📊 Resumo da semana</h3>
          <p>💰 Total pago: <strong>R$ ${totalPaid.toFixed(2)}</strong></p>
          <p>📋 Contas pagas: <strong>${paidThisWeek.length}</strong></p>
          <p>💵 Saldo livre: <strong>R$ ${freeBalance.toFixed(2)}</strong></p>
        </div>
        
        <div style="background: #f4f4f4; padding: 15px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">⏰ Próximos vencimentos</h3>
          ${upcomingBills.length > 0 
            ? upcomingBills.map(b => `<p>📅 <strong>${b.name}</strong> - Dia ${b.due_day} - R$ ${(b.value || 0).toFixed(2)}</p>`).join('')
            : '<p>Nenhuma conta a vencer na próxima semana! 🎉</p>'}
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://sandrosiqueiradavid.github.io/Tobby" style="background: #22D07A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 30px; display: inline-block;">
            Abrir Tobby
          </a>
        </div>
        
        <hr style="margin: 30px 0;">
        <p style="text-align: center; color: #888; font-size: 12px;">
          Você recebeu este e-mail porque configurou notificações semanais no Tobby.
        </p>
      </div>
    </body>
    </html>
  `;
  
  // Enviar e-mail usando Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Tobby <notificacoes@tobby.com>',
          to: [userEmail],
          subject: `🐶 Tobby - Resumo da semana (${weekStart.toLocaleDateString('pt-BR')} - ${today.toLocaleDateString('pt-BR')})`,
          html: html
        })
      });
      console.log(`📧 E-mail semanal enviado para ${userEmail}`);
    } catch (err) {
      console.error('Erro ao enviar e-mail:', err);
    }
  }
}

async function sendWeeklyReports() {
  console.log('📧 Iniciando envio de relatórios semanais...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, salary_encrypted');
  
  if (error) {
    console.error('Erro ao buscar usuários:', error);
    return;
  }
  
  for (const user of users) {
    if (!user.email) continue;
    
    const salary = decryptNumber(user.salary_encrypted) || 0;
    
    const { data: bills } = await supabase
      .from('bills')
      .select('id, name, value_encrypted, status, due_day, created_at')
      .eq('user_id', user.id);
    
    const billsWithValues = (bills || []).map(b => ({
      ...b,
      value: decryptNumber(b.value_encrypted)
    }));
    
    await generateWeeklySummary(user.id, user.email, user.name || 'Usuário', billsWithValues, salary);
  }
  
  console.log('✅ Relatórios semanais enviados');
}

function scheduleWeeklyReports() {
  const now = new Date();
  const sunday = new Date();
  sunday.setDate(now.getDate() + (7 - now.getDay()));
  sunday.setHours(10, 0, 0, 0);
  
  const delay = sunday - now;
  
  setTimeout(() => {
    sendWeeklyReports();
    setInterval(sendWeeklyReports, 7 * 24 * 60 * 60 * 1000);
  }, delay);
  
  console.log(`📧 Relatório semanal agendado para: ${sunday.toLocaleString()}`);
}

module.exports = { sendWeeklyReports, scheduleWeeklyReports };