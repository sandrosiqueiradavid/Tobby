const supabase = require('../db/supabase');
const { generateWeeklySummary } = require('../services/emailService');
const { decryptNumber } = require('../utils/crypto');

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

// Agendar para todo domingo às 10h
function scheduleWeeklyReports() {
  const now = new Date();
  const sunday = new Date();
  sunday.setDate(now.getDate() + (7 - now.getDay()));
  sunday.setHours(10, 0, 0, 0);
  
  const delay = sunday - now;
  
  setTimeout(() => {
    sendWeeklyReports();
    // Agendar próximo
    setInterval(sendWeeklyReports, 7 * 24 * 60 * 60 * 1000);
  }, delay);
  
  console.log(`📧 Relatório semanal agendado para: ${sunday.toLocaleString()}`);
}

module.exports = { sendWeeklyReports, scheduleWeeklyReports };