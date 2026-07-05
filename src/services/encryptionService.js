// src/services/encryptionService.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY) {
  console.warn('⚠️ ENCRYPTION_KEY não configurada! Criptografia AES-256-GCM desativada.');
}

// Converte string para Buffer
function getKey() {
  if (!ENCRYPTION_KEY) return null;
  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

// Criptografar número
function encryptNumber(value) {
  if (!ENCRYPTION_KEY) return String(value);
  
  try {
    const key = getKey();
    if (!key) return String(value);
    
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(String(value), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + AuthTag + Encrypted
    const result = Buffer.concat([iv, authTag, encrypted]);
    return result.toString('base64');
  } catch (err) {
    console.error('Erro ao criptografar:', err);
    return String(value);
  }
}

// Descriptografar número
function decryptNumber(encrypted) {
  if (!encrypted || !ENCRYPTION_KEY) {
    return parseFloat(encrypted) || 0;
  }
  
  try {
    const key = getKey();
    if (!key) return parseFloat(encrypted) || 0;
    
    const buffer = Buffer.from(encrypted, 'base64');
    
    // Extrair IV (12 bytes), AuthTag (16 bytes) e dados
    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const encryptedText = buffer.subarray(28);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final()
    ]);
    
    return parseFloat(decrypted.toString('utf8')) || 0;
  } catch (err) {
    console.warn('Erro ao descriptografar:', err.message);
    return parseFloat(encrypted) || 0;
  }
}

// Verificar se a criptografia está ativa
function isEncryptionEnabled() {
  return !!ENCRYPTION_KEY;
}

module.exports = {
  encryptNumber,
  decryptNumber,
  isEncryptionEnabled
};