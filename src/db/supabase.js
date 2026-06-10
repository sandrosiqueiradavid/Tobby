const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing!');
}

// Garantir que a URL não tem barra no final
const cleanUrl = supabaseUrl?.replace(/\/$/, '');

// Configuração com schema explícito
const supabase = createClient(cleanUrl, supabaseKey, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false
  }
});

// Teste de conexão com a tabela específica
(async () => {
  try {
    // Teste de conexão com a tabela
    const { error, count, data } = await supabase
      .from('tobby_users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Supabase error: ${error.message} (Code: ${error.code})`);
      console.error(`📋 Full error:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Supabase connected successfully! Users count: ${count}`);
      
      // Verificar se consegue ler os dados
      const { data: users, error: readError } = await supabase
        .from('tobby_users')
        .select('id, name, email')
        .limit(1);
      
      if (readError) {
        console.error(`❌ Error reading data: ${readError.message}`);
      } else if (users && users.length > 0) {
        console.log(`✅ Sample user found: ${users[0].email}`);
      }
    }
  } catch (err) {
    console.error(`❌ Supabase exception: ${err.message}`);
  }
})();

module.exports = supabase;