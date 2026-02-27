const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateObjectId, validateCardCreation } = require('../middleware/validation');
const cardsController = require('../controllers/cardsController');

// All routes require authentication
router.use(protect);

// GET /api/cards - list user's cards
router.get('/', cardsController.getUserCards);

// POST /api/cards - create a new card
router.post('/', validateCardCreation, cardsController.createCard);

// PUT /api/cards/:id/pin - change PIN
router.put('/:id/pin', validateObjectId, cardsController.updateCardPin);

// PUT /api/cards/:id/status - update status (lock/unlock)
router.put('/:id/status', validateObjectId, cardsController.updateCardStatus);

module.exports = router;
