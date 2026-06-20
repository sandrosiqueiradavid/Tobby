// Este arquivo está deprecated - use o encryptionService
// Mantido apenas para compatibilidade com código existente

const { encrypt, decrypt, encryptNumber, decryptNumber } = require('../services/encryptionService');

module.exports = { encrypt, decrypt, encryptNumber, decryptNumber };