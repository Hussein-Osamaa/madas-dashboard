const { body, param, query } = require('express-validator');

const create = [
  body('brandName').trim().notEmpty().withMessage('Brand name is required'),
  body('owner.name').trim().notEmpty().withMessage('Owner name is required'),
  body('owner.email').isEmail().withMessage('Valid owner email is required'),
  body('owner.phone').optional().trim(),
  body('contact.email').optional().isEmail(),
  body('contact.phone').optional().trim(),
  body('contact.address').optional().trim(),
  body('subscriptionPlan')
    .optional()
    .isIn(['starter', 'standard', 'premium', 'enterprise'])
    .withMessage('Invalid subscription plan'),
];

const update = [
  param('id').isMongoId().withMessage('Invalid client ID'),
  body('brandName').optional().trim().notEmpty(),
  body('owner.name').optional().trim().notEmpty(),
  body('owner.email').optional().isEmail(),
  body('owner.phone').optional().trim(),
  body('subscriptionPlan')
    .optional()
    .isIn(['starter', 'standard', 'premium', 'enterprise']),
  body('active').optional().isBoolean(),
  body('systemAccess').optional().isObject(),
  body('systemAccess.dashboard').optional().isBoolean(),
  body('systemAccess.finance').optional().isBoolean(),
  body('systemAccess.fulfillment').optional().isBoolean(),
  body('systemAccess.shipping').optional().isBoolean(),
  body('features').optional().isObject(),
  body('suspensionReason').optional(),
];

const idParam = [param('id').isMongoId().withMessage('Invalid client ID')];

module.exports = { create, update, idParam };
