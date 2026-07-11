const express = require('express');
const router = express.Router();
const pelangganSupplierCtrl = require('../controllers/pelangganSupplier.controller');
const pembeliCtrl = require('../controllers/pembeli.controller');
const adminCtrl = require('../controllers/admin.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('manajemen-user'));

router.get('/pelanggan-supplier', pelangganSupplierCtrl.getAll);
router.post('/pelanggan-supplier', pelangganSupplierCtrl.create);
router.put('/pelanggan-supplier/:id', pelangganSupplierCtrl.update);
router.delete('/pelanggan-supplier/:id', pelangganSupplierCtrl.remove);

router.get('/pembeli', pembeliCtrl.getAll);
router.post('/pembeli', pembeliCtrl.create);
router.put('/pembeli/:id', pembeliCtrl.update);
router.delete('/pembeli/:id', pembeliCtrl.remove);

router.get('/admin', adminCtrl.getAll);
router.post('/admin', adminCtrl.create);
router.put('/admin/:id', adminCtrl.update);
router.delete('/admin/:id', adminCtrl.remove);

module.exports = router;
