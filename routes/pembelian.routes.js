const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pembelian.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('pembelian'));

router.get('/', ctrl.getPembelian);
router.get('/:id', ctrl.getPembelianById);
router.post('/', ctrl.createPembelian);
router.put('/:id', ctrl.updatePembelian);
router.delete('/:id', ctrl.deletePembelian);
router.post('/:id/pembayaran', ctrl.bayarHutang);

module.exports = router;
