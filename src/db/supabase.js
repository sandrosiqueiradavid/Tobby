const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Tenta diferentes nomes de variável para compatibilidade
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.SUPABASE_ANON_KEY;

console.log('🔌 Conectando ao Supabase...');
console.log('URL:', supabaseUrl ? '✅ Configurada' : '❌ FALTANDO');
console.log('KEY:', supabaseKey ? '✅ Configurada' : '❌ FALTANDO');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis do Supabase não configuradas corretamente!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Teste de conexão
supabase.from('users').select('count', { count: 'exact', head: true })
  .then(({ error, count }) => {
    if (error) {
      console.error('❌ Erro de conexão com Supabase:', error.message);
    } else {
      console.log('✅ Supabase conectado! Total de usuários:', count);
    }
  });

module.exports = supabase;