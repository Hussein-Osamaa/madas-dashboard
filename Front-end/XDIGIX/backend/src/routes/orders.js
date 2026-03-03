const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { restrictToClient, injectClientFilter } = require('../middleware/clientAccess');
const { staffOnly } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { create, update, idParam } = require('../validators/order');

router.use(protect);
router.use(restrictToClient);
router.use(injectClientFilter);

router.get('/', orderController.getAll);
router.get('/:id', idParam, validate, orderController.getById);

router.post('/', staffOnly, create, validate, orderController.create);
router.patch('/:id', staffOnly, update, validate, orderController.update);
router.delete('/:id', staffOnly, idParam, validate, orderController.delete);

module.exports = router;
