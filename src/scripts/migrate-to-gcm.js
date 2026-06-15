// scripts/migrate-to-gcm.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { encryptNumber, decryptNumber } = require('../src/utils/crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function migrateTable(tableName, encryptedFields) {
  console.log(`📦 Migrando tabela: ${tableName}`);
  
  const { data: records, error } = await supabase
    .from(tableName)
    .select('id, ' + encryptedFields.join(','));
  
  if (error) {
    console.error(`Erro ao buscar ${tableName}:`, error);
    return;
  }
  
  let migrated = 0;
  for (const record of records) {
    const updates = {};
    for (const field of encryptedFields) {
      if (record[field]) {
        const value = decryptNumber(record[field]);
        if (value !== null && !isNaN(value)) {
          updates[field] = encryptNumber(value);
        }
      }
    }
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', record.id);
      
      if (!updateError) {
        migrated++;
      }
    }
  }
  
  console.log(`✅ ${tableName}: ${migrated} registros migrados`);
}

async function runMigration() {
  console.log('🚀 Iniciando migração para AES-256-GCM...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await migrateTable('users', ['salary_encrypted']);
  await migrateTable('bills', ['value_encrypted']);
  await migrateTable('investments', ['purchase_price_encrypted', 'current_price_encrypted']);
  await migrateTable('loans', ['total_principal_encrypted', 'outstanding_balance_encrypted', 'monthly_payment_encrypted']);
  await migrateTable('assets', ['estimated_value_encrypted', 'acquisition_value_encrypted']);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Migração concluída!');
}

runMigration();