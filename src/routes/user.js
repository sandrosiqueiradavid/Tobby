// src/routes/user.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.get('/profile', userController.getProfile);
router.put('/salary', userController.updateSalary);

module.exports = router;