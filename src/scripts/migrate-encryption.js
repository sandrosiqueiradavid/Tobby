// scripts/migrate-encryption.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { encryptNumber, decryptNumber } = require('../src/utils/crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function migrateUsers() {
  const { data: users, error } = await supabase
    .from('tobby_users')
    .select('id, salary');
  
  if (error) {
    console.error('Erro ao buscar users:', error);
    return;
  }
  
  for (const user of users) {
    if (user.salary && !user.salary_encrypted) {
      const encrypted = encryptNumber(user.salary);
      await supabase
        .from('tobby_users')
        .update({ salary_encrypted: encrypted })
        .eq('id', user.id);
      console.log(`✅ Usuário ${user.id} migrado`);
    }
  }
}

async function migrateBills() {
  const { data: bills, error } = await supabase
    .from('tobby_bills')
    .select('id, value');
  
  if (error) {
    console.error('Erro ao buscar bills:', error);
    return;
  }
  
  for (const bill of bills) {
    if (bill.value && !bill.value_encrypted) {
      const encrypted = encryptNumber(bill.value);
      await supabase
        .from('tobby_bills')
        .update({ value_encrypted: encrypted })
        .eq('id', bill.id);
      console.log(`✅ Bill ${bill.id} migrado`);
    }
  }
}

async function migrateInvestments() {
  const { data: investments, error } = await supabase
    .from('investments')
    .select('id, purchase_price, current_price');
  
  if (error) {
    console.error('Erro ao buscar investments:', error);
    return;
  }
  
  for (const inv of investments) {
    const updates = {};
    if (inv.purchase_price && !inv.purchase_price_encrypted) {
      updates.purchase_price_encrypted = encryptNumber(inv.purchase_price);
    }
    if (inv.current_price && !inv.current_price_encrypted) {
      updates.current_price_encrypted = encryptNumber(inv.current_price);
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('investments')
        .update(updates)
        .eq('id', inv.id);
      console.log(`✅ Investimento ${inv.id} migrado`);
    }
  }
}

async function migrateLoans() {
  const { data: loans, error } = await supabase
    .from('loans')
    .select('id, total_principal, outstanding_balance, monthly_payment');
  
  if (error) {
    console.error('Erro ao buscar loans:', error);
    return;
  }
  
  for (const loan of loans) {
    const updates = {};
    if (loan.total_principal && !loan.total_principal_encrypted) {
      updates.total_principal_encrypted = encryptNumber(loan.total_principal);
    }
    if (loan.outstanding_balance && !loan.outstanding_balance_encrypted) {
      updates.outstanding_balance_encrypted = encryptNumber(loan.outstanding_balance);
    }
    if (loan.monthly_payment && !loan.monthly_payment_encrypted) {
      updates.monthly_payment_encrypted = encryptNumber(loan.monthly_payment);
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('loans')
        .update(updates)
        .eq('id', loan.id);
      console.log(`✅ Loan ${loan.id} migrado`);
    }
  }
}

async function migrateAssets() {
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, estimated_value, acquisition_value');
  
  if (error) {
    console.error('Erro ao buscar assets:', error);
    return;
  }
  
  for (const asset of assets) {
    const updates = {};
    if (asset.estimated_value && !asset.estimated_value_encrypted) {
      updates.estimated_value_encrypted = encryptNumber(asset.estimated_value);
    }
    if (asset.acquisition_value && !asset.acquisition_value_encrypted) {
      updates.acquisition_value_encrypted = encryptNumber(asset.acquisition_value);
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('assets')
        .update(updates)
        .eq('id', asset.id);
      console.log(`✅ Asset ${asset.id} migrado`);
    }
  }
}

async function runMigrations() {
  console.log('🚀 Iniciando migração de dados para criptografia...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await migrateUsers();
  await migrateBills();
  await migrateInvestments();
  await migrateLoans();
  await migrateAssets();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Migração concluída!');
}

runMigrations();