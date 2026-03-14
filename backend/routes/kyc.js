const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');
const { submitKyc, getKycStatus } = require('../controllers/kyc.controller');
const { createKycUploader } = require('../middleware/upload');

const kycUploader = createKycUploader();

router.use(protect);
router.use(uploadLimiter);

router.get('/status', getKycStatus);
router.post('/submit', kycUploader.array('documents', 3), submitKyc);

module.exports = router;
