const { body, param } = require('express-validator');

const create = [
  body('orderRef').isMongoId().withMessage('Valid order reference is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Return must have at least one item'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.variantId').optional().isMongoId(),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.condition')
    .isIn(['restock', 'damaged'])
    .withMessage('Condition must be restock or damaged'),
  body('items.*.notes').optional().trim(),
];

const approve = [param('id').isMongoId().withMessage('Invalid return ID')];

module.exports = { create, approve };
