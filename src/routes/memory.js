const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', memoryController.getMemories);
router.post('/', memoryController.saveMemory);
router.delete('/:key', memoryController.deleteMemory);
router.delete('/', memoryController.clearMemories);

module.exports = router;