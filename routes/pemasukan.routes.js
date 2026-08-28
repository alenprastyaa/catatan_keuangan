const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pemasukan.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('pemasukan-kas'));

router.get('/saldo-awal', ctrl.getSaldoAwal);
router.put('/saldo-awal', ctrl.updateSaldoAwal);
router.get('/', ctrl.getPemasukan);
router.post('/', ctrl.createPemasukan);
router.put('/:id', ctrl.updatePemasukan);
router.delete('/:id', ctrl.deletePemasukan);

module.exports = router;
