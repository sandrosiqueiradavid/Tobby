const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// Log de inicialização
console.log('[CRYPTO] Inicializando...');
console.log('[CRYPTO] ENCRYPTION_KEY configurada:', !!ENCRYPTION_KEY);
if (ENCRYPTION_KEY) {
  console.log('[CRYPTO] Tamanho da chave:', ENCRYPTION_KEY.length);
}

function encrypt(text) {
  if (!text && text !== 0) {
    console.warn('[CRYPTO] encrypt: valor nulo, retornando null');
    return null;
  }
  
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('[CRYPTO] ENCRYPTION_KEY não configurada corretamente');
    return null;
  }
  
  try {
    const textStr = text.toString();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    const encrypted = Buffer.concat([cipher.update(textStr, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
    console.log('[CRYPTO] encrypt: sucesso');
    return result;
  } catch (err) {
    console.error('[CRYPTO] encrypt error:', err.message);
    return null;
  }
}

function decrypt(encryptedText) {
  if (!encryptedText) {
    console.warn('[CRYPTO] decrypt: valor nulo');
    return null;
  }
  
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('[CRYPTO] ENCRYPTION_KEY não configurada');
    return null;
  }
  
  try {
    const parts = encryptedText.split(':');
    
    // Fallback para dados antigos (sem criptografia)
    if (parts.length === 1) {
      console.log('[CRYPTO] decrypt: dado não criptografado, retornando original');
      return isNaN(encryptedText) ? encryptedText : parseFloat(encryptedText);
    }
    
    if (parts.length !== 3) {
      console.warn('[CRYPTO] decrypt: formato inválido');
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const result = isNaN(decrypted) ? decrypted : parseFloat(decrypted);
    console.log('[CRYPTO] decrypt: sucesso');
    return result;
  } catch (err) {
    console.error('[CRYPTO] decrypt error:', err.message);
    return null;
  }
}

function encryptNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    console.warn('[CRYPTO] encryptNumber: valor inválido', value);
    return null;
  }
  return encrypt(num.toString());
}

function decryptNumber(encryptedValue) {
  const decrypted = decrypt(encryptedValue);
  if (decrypted === null) return 0;
  const num = parseFloat(decrypted);
  return isNaN(num) ? 0 : num;
}

module.exports = { encrypt, decrypt, encryptNumber, decryptNumber };