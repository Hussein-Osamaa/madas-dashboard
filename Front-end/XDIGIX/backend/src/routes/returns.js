const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { protect } = require('../middleware/auth');
const { restrictToClient, injectClientFilter } = require('../middleware/clientAccess');
const { staffOnly } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { create, approve } = require('../validators/return');

router.use(protect);
router.use(restrictToClient);
router.use(injectClientFilter);

router.get('/', returnController.getAll);
router.get('/:id', approve, validate, returnController.getById);

router.post('/', staffOnly, create, validate, returnController.create);
router.post('/:id/approve', staffOnly, approve, validate, returnController.approve);
router.post('/:id/reject', staffOnly, approve, validate, returnController.reject);

module.exports = router;
