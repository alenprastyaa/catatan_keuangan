const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/role.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('manajemen-user'));

router.get('/', ctrl.getRoles);
router.post('/', ctrl.createRole);
router.put('/:id', ctrl.updateRole);
router.delete('/:id', ctrl.deleteRole);

module.exports = router;
