const crypto = require('crypto');

// ===== CONFIGURAÇÃO =====
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// ===== LOG DE INICIALIZAÇÃO =====
console.log('[CRYPTO] Inicializando serviço de criptografia...');
if (ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64) {
  console.log('[CRYPTO] ✅ Chave de criptografia configurada corretamente');
} else {
  console.warn('[CRYPTO] ⚠️ ENCRYPTION_KEY não configurada. Dados serão armazenados em texto plano.');
}

// ===== CRIPTOGRAFAR =====
function encrypt(value) {
  // Se não houver chave ou valor inválido, retorna o valor original
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    return value !== undefined && value !== null ? value.toString() : null;
  }

  if (value === undefined || value === null) {
    return null;
  }

  try {
    const textStr = value.toString();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(textStr, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    // Formato: iv:authTag:encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error('[CRYPTO] Erro ao criptografar:', err.message);
    return value !== undefined && value !== null ? value.toString() : null;
  }
}

// ===== DESCRIPTOGRAFAR =====
function decrypt(encryptedValue) {
  // Se não houver chave, retorna o valor original
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    return encryptedValue;
  }

  if (!encryptedValue) {
    return '0';
  }

  try {
    const parts = encryptedValue.split(':');
    
    // Se não estiver no formato esperado, retorna o valor original
    if (parts.length !== 3) {
      return encryptedValue;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[CRYPTO] Erro ao descriptografar:', err.message);
    return encryptedValue;
  }
}

// ===== FUNÇÕES AUXILIARES =====
function encryptNumber(value) {
  if (value === undefined || value === null) return null;
  return encrypt(value);
}

function decryptNumber(encryptedValue) {
  const decrypted = decrypt(encryptedValue);
  if (decrypted === null || decrypted === undefined) return 0;
  const num = parseFloat(decrypted);
  return isNaN(num) ? 0 : num;
}

// ===== EXPORTAÇÕES =====
module.exports = {
  encrypt,
  decrypt,
  encryptNumber,
  decryptNumber
};