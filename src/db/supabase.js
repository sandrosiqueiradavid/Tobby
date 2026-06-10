const { createClient } = require('@supabase/supabase-js');

// Configuração básica, sem opções extras
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_SECRET_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
}

// Criar cliente com configuração padrão
const supabase = createClient(supabaseUrl, supabaseKey);

// Teste rápido de conexão
(async () => {
  try {
    const { error, count } = await supabase
      .from('tobby_users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Supabase connection error: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Supabase connected successfully! Users count: ${count}`);
    }
  } catch (err) {
    console.error(`❌ Supabase connection exception: ${err.message}`);
  }
})();

module.exports = supabase;