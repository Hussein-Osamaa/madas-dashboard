const { body } = require('express-validator');

const login = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const register = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'staff', 'client'])
    .withMessage('Invalid role'),
  body('phone').optional().trim(),
  body('clientId').optional().isMongoId().withMessage('Invalid client ID'),
];

const forgotPassword = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

module.exports = { login, register, forgotPassword, resetPassword };
