const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

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
  let encrypted = cipher.update(textStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Descriptografar texto
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  const parts = encryptedText.split(':');
  if (parts.length !== 2) return encryptedText; // Fallback para dados não criptografados
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return isNaN(decrypted) ? decrypted : parseFloat(decrypted);
}

// Criptografar número (para valores financeiros)
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