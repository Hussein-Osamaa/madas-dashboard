const express = require('express');
const router = express.Router();
const scanLogController = require('../controllers/scanLogController');
const { protect } = require('../middleware/auth');
const { restrictToClient, injectClientFilter } = require('../middleware/clientAccess');
const { param } = require('express-validator');
const validate = require('../middleware/validate');

router.use(protect);
router.use(restrictToClient);
router.use(injectClientFilter);

router.get('/', scanLogController.getAll);
router.get('/:id', param('id').isMongoId().withMessage('Invalid ID'), validate, scanLogController.getById);

module.exports = router;
