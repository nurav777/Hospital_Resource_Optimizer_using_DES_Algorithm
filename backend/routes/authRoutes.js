const express = require('express');
const { register, login } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/register', authMiddleware, roleMiddleware(['Admin']), register);
router.post('/login', login);

module.exports = router;
