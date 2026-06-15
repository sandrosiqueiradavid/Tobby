const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('[AUTH] Verificando token...');
    console.log('[AUTH] Authorization header:', authHeader ? 'Presente' : 'Ausente');
    
    if (!authHeader) {
      console.warn('[AUTH] Token não fornecido');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      console.warn('[AUTH] Token mal formatado');
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) {
      console.warn('[AUTH] Scheme inválido:', scheme);
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('[AUTH] JWT_SECRET não configurado!');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH] Token válido para userId:', decoded.userId);
    
    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.error('[AUTH] Erro:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return res.status(401).json({ error: 'Erro ao autenticar' });
  }
};