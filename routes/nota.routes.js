const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/nota.controller');
const { verifyToken, checkMenuAccess } = require('../middleware/auth');

router.use(verifyToken, checkMenuAccess('nota'));

router.get('/', ctrl.getNota);
router.get('/:id', ctrl.getNotaById);
router.post('/', ctrl.createNota);
router.put('/:id', ctrl.updateNota);
router.delete('/:id', ctrl.deleteNota);

module.exports = router;
