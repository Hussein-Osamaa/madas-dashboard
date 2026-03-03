const { body, param } = require('express-validator');

const create = [
  body('order').isMongoId().withMessage('Valid order ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be non-negative'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'bank_transfer', 'online', 'other'])
    .withMessage('Invalid payment method'),
  body('date').optional().isISO8601().withMessage('Invalid date'),
  body('reference').optional().trim(),
  body('notes').optional().trim(),
];

const idParam = [param('id').isMongoId().withMessage('Invalid payment ID')];

module.exports = { create, idParam };
