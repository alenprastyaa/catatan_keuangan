const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/penjualan.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('penjualan'));

router.get('/', ctrl.getPenjualan);
router.get('/:id', ctrl.getPenjualanById);
router.post('/', ctrl.createPenjualan);
router.put('/:id', ctrl.updatePenjualan);
router.delete('/:id', ctrl.deletePenjualan);
router.post('/:id/pembayaran', ctrl.bayarPiutang);

module.exports = router;
