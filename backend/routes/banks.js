const express = require('express');
const { getBanks, addBank, deleteBank } = require('../controllers/bankController');

const router = express.Router();

router.get('/', getBanks);
router.post('/', addBank);
router.delete('/:id', deleteBank);

module.exports = router;
