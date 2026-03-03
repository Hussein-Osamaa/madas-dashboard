const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { restrictToClient, injectClientFilter } = require('../middleware/clientAccess');
const { staffOnly } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { create, update, idParam, audit } = require('../validators/product');

router.use(protect);
router.use(restrictToClient);
router.use(injectClientFilter);

router.get('/', productController.getAll);
router.get('/barcode/:barcode', productController.getByBarcode);
router.get('/:id', idParam, validate, productController.getById);

router.post('/', staffOnly, create, validate, productController.create);
router.post('/audit', staffOnly, audit, validate, productController.audit);
router.patch('/:id', staffOnly, update, validate, productController.update);
router.delete('/:id', staffOnly, idParam, validate, productController.delete);

module.exports = router;
