const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function encrypt(text) {
  if (!text && text !== 0) {
    console.warn('[CRYPTO] encrypt: valor nulo');
    return null;
  }
  
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('[CRYPTO] ENCRYPTION_KEY não configurada');
    return null;
  }
  
  try {
    const textStr = text.toString();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    const encrypted = Buffer.concat([cipher.update(textStr, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error('[CRYPTO] encrypt error:', err.message);
    return null;
  }
}

function decrypt(encryptedText) {
  if (!encryptedText) {
    return null;
  }
  
  // Fallback para dados em texto plano (começam com "plain:")
  if (typeof encryptedText === 'string' && encryptedText.startsWith('plain:')) {
    const value = encryptedText.replace('plain:', '');
    return isNaN(value) ? value : parseFloat(value);
  }
  
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('[CRYPTO] ENCRYPTION_KEY não configurada');
    return null;
  }
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return isNaN(decrypted) ? decrypted : parseFloat(decrypted);
  } catch (err) {
    console.error('[CRYPTO] decrypt error:', err.message);
    return null;
  }
}

function encryptNumber(value) {
  if (value === undefined || value === null) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return encrypt(num.toString());
}

function decryptNumber(encryptedValue) {
  const decrypted = decrypt(encryptedValue);
  if (decrypted === null) return 0;
  const num = parseFloat(decrypted);
  return isNaN(num) ? 0 : num;
}

module.exports = { encrypt, decrypt, encryptNumber, decryptNumber };