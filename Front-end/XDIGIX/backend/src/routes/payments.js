const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { restrictToClient, injectClientFilter } = require('../middleware/clientAccess');
const { staffOnly } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { create, idParam } = require('../validators/payment');

router.use(protect);
router.use(restrictToClient);
router.use(injectClientFilter);

router.get('/', paymentController.getAll);
router.get('/:id', idParam, validate, paymentController.getById);

router.post('/', staffOnly, create, validate, paymentController.create);
router.delete('/:id', staffOnly, idParam, validate, paymentController.delete);

module.exports = router;
