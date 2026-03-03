const { body, param } = require('express-validator');

const create = [
  body('clientId').isMongoId().withMessage('Valid client ID is required'),
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('phone').optional().trim(),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must have at least one item'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required for each item'),
  body('items.*.variantId').optional().isMongoId(),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('totalPrice').isFloat({ min: 0 }).withMessage('Total price must be non-negative'),
  body('notes').optional().trim(),
];

const update = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('shippingStatus')
    .optional()
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'paid', 'refunded']),
];

const idParam = [param('id').isMongoId().withMessage('Invalid order ID')];

module.exports = { create, update, idParam };
