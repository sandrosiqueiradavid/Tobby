const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔌 INICIANDO CLIENTE SUPABASE');
console.log(`📡 URL: ${supabaseUrl}`);
console.log(`🔑 KEY: ${supabaseKey ? supabaseKey.substring(0, 15) + '...' : '❌'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Teste rápido
(async () => {
  try {
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Erro no teste:', error.message);
    } else {
      console.log(`✅ Cliente Supabase funcionando! Total de usuários: ${count}`);
    }
  } catch (err) {
    console.error('❌ Exceção no teste:', err.message);
  }
})();

module.exports = supabase;