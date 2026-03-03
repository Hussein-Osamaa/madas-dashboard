const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

const createUser = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'staff']),
  body('phone').optional().trim(),
  body('permissions').optional().isArray(),
  body('permissions.*').optional().isString(),
];

router.use(protect);
router.use(adminOnly);

router.post('/', createUser, validate, userController.create);
router.get('/', userController.getAll);
router.get('/:id', param('id').isMongoId().withMessage('Invalid ID'), validate, userController.getById);
router.patch('/:id', param('id').isMongoId().withMessage('Invalid ID'), validate, userController.update);

module.exports = router;
