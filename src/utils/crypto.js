const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recomenda 12 bytes

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.error('❌ ENCRYPTION_KEY não configurada corretamente. Deve ter 64 caracteres hex (32 bytes).');
  console.error('💡 Gere uma chave com: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
}

// Criptografar texto
function encrypt(text) {
  if (!text && text !== 0) return null;
  const textStr = text.toString();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  const encrypted = Buffer.concat([cipher.update(textStr, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encrypted
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
}

// Descriptografar texto
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  const parts = encryptedText.split(':');
  
  // Fallback para dados antigos (CBC)
  if (parts.length === 2) {
    try {
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return isNaN(decrypted) ? decrypted : parseFloat(decrypted);
    } catch (err) {
      console.error('Erro no fallback CBC:', err);
      return null;
    }
  }
  
  // Formato GCM (iv:authTag:encrypted)
  if (parts.length !== 3) return encryptedText;
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return isNaN(decrypted) ? decrypted : parseFloat(decrypted);
}

// Criptografar número
function encryptNumber(value) {
  if (value === undefined || value === null) return null;
  return encrypt(value.toString());
}

// Descriptografar número
function decryptNumber(encryptedValue) {
  const decrypted = decrypt(encryptedValue);
  return decrypted !== null ? parseFloat(decrypted) : 0;
}

module.exports = { encrypt, decrypt, encryptNumber, decryptNumber };