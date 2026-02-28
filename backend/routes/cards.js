const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validateCardCreation } = require('../middleware/validation');
const cardsController = require('../controllers/cardsController');

router.use(protect);

router.get('/', cardsController.getUserCards);
router.get('/admin/user/:id', authorize('admin'), validateObjectId, cardsController.getUserCardsAdmin);

router.post('/', validateCardCreation, cardsController.createCard);

router.put('/:id/pin', validateObjectId, cardsController.updateCardPin);

router.put('/:id/status', validateObjectId, cardsController.updateCardStatus);

router.post('/:id/reveal-cvv', validateObjectId, cardsController.revealCardCvv);

module.exports = router;
