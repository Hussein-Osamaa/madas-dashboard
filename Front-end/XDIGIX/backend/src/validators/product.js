const { body, param, query } = require('express-validator');

const create = [
  body('clientId').isMongoId().withMessage('Valid client ID is required'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').optional().trim(),
  body('barcode').optional().trim(),
  body('variants')
    .optional()
    .isArray()
    .withMessage('Variants must be an array'),
  body('variants.*.size').optional().trim(),
  body('variants.*.color').optional().trim(),
  body('variants.*.sku').optional().trim(),
  body('variants.*.barcode').optional().trim(),
  body('variants.*.quantity').optional().isInt({ min: 0 }),
  body('variants.*.costPrice').optional().isFloat({ min: 0 }),
  body('variants.*.sellingPrice').optional().isFloat({ min: 0 }),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('sellingPrice').optional().isFloat({ min: 0 }),
  body('quantity').optional().isInt({ min: 0 }),
  body('lowStockAlert').optional().isInt({ min: 0 }),
];

const update = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('clientId').optional().isMongoId(),
  body('name').optional().trim().notEmpty(),
  body('sku').optional().trim(),
  body('barcode').optional().trim(),
  body('variants').optional().isArray(),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('sellingPrice').optional().isFloat({ min: 0 }),
  body('quantity').optional().isInt({ min: 0 }),
  body('lowStockAlert').optional().isInt({ min: 0 }),
  body('active').optional().isBoolean(),
];

const idParam = [param('id').isMongoId().withMessage('Invalid product ID')];

const audit = [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('variantId').optional().isMongoId(),
];

module.exports = { create, update, idParam, audit };
