// crypto.js - Versão simplificada (sem criptografia real)
// Mantido apenas para compatibilidade com código existente

function encryptNumber(value) {
  // Retorna o valor como string (sem criptografia)
  if (value === undefined || value === null) return null;
  return value.toString();
}

function decryptNumber(value) {
  // Retorna o valor como número
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function encrypt(text) {
  return text;
}

function decrypt(text) {
  return text;
}

module.exports = { encrypt, decrypt, encryptNumber, decryptNumber };