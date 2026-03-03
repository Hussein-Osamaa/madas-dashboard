const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { login, register, forgotPassword, resetPassword } = require('../validators/auth');
const { adminOnly } = require('../middleware/roles');

router.post('/login', loginLimiter, login, validate, authController.login);
router.post('/register', protect, adminOnly, register, validate, authController.register);
router.get('/me', protect, authController.me);
router.post('/ensure-workspace', protect, authController.ensureWorkspace);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword, validate, authController.forgotPassword);
router.post('/reset-password', resetPassword, validate, authController.resetPassword);

module.exports = router;
