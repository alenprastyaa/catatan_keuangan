const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/kas.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('pengeluaran-kas'));

router.get('/', ctrl.getKas);
router.post('/', ctrl.createKas);
router.put('/:id', ctrl.updateKas);
router.delete('/:id', ctrl.deleteKas);

module.exports = router;
