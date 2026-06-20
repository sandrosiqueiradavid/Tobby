const express = require('express');
const router = express.Router();
const lifeEventsController = require('../controllers/lifeEventsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', lifeEventsController.getEvents);
router.post('/', lifeEventsController.createEvent);
router.put('/:id', lifeEventsController.updateEvent);
router.delete('/:id', lifeEventsController.deleteEvent);

module.exports = router;