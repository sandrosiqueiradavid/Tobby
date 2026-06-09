const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const auth = require('../middleware/auth')

router.use(auth)
router.get('/profile', userController.getProfile)
router.put('/salary', userController.updateSalary)

module.exports = router
