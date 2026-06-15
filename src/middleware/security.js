const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const xss = require('xss');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições, tente novamente mais tarde' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas de login, tente novamente mais tarde' }
});

// Helmet configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});

// Validação de entrada
const validateBill = [
  body('name').trim().isLength({ min: 1, max: 200 }).escape(),
  body('value').isFloat({ min: 0.01 }),
  body('due_day').isInt({ min: 1, max: 31 }),
  body('category').optional().isString().trim(),
  body('status').optional().isIn(['pending', 'paid', 'late'])
];

const validateUser = [
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

// Sanitização de saída
const sanitizeOutput = (data) => {
  if (typeof data === 'string') return xss(data);
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = typeof value === 'string' ? xss(value) : value;
    }
    return sanitized;
  }
  return data;
};

// Middleware de validação
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Log de acesso administrativo
const adminAudit = async (req, res, next) => {
  const start = Date.now();
  res.on('finish', async () => {
    const duration = Date.now() - start;
    console.log(`[ADMIN] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });
  next();
};

module.exports = {
  limiter,
  authLimiter,
  securityHeaders,
  validateBill,
  validateUser,
  validate,
  sanitizeOutput,
  adminAudit
};