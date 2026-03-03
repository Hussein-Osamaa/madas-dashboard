const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect } = require('../middleware/auth');
const { restrictToClient, injectClientFilter } = require('../middleware/clientAccess');
const { staffOnly, adminOnly, requirePermission, requireStaffPermission } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { create, update, idParam } = require('../validators/client');

router.use(protect);
router.use(restrictToClient);
router.use(injectClientFilter);

router.get('/', requireStaffPermission('clients:read'), clientController.getAll);
router.get('/:id', requireStaffPermission('clients:read'), param('id').isString().notEmpty(), validate, clientController.getById);

router.post('/', staffOnly, requirePermission('clients:write'), create, validate, clientController.create);
router.post('/with-owner', adminOnly, clientController.createWithOwner);
router.patch('/:id', requirePermission('clients:write'), update, validate, clientController.update);
router.delete('/:id', adminOnly, idParam, validate, clientController.delete);

module.exports = router;
