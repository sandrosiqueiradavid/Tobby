const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware); // Todas as rotas precisam de autenticação

router.get('/profile', userController.getProfile);
router.put('/salary', userController.updateSalary);

module.exports = router;
