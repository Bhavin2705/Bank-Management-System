const fs = require('fs');
const path = require('path');
const multer = require('multer');

const PROFILE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'profile');
const KYC_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'kyc');

if (!fs.existsSync(PROFILE_UPLOAD_DIR)) {
    fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(KYC_UPLOAD_DIR)) {
    fs.mkdirSync(KYC_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, PROFILE_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
        const userId = req.user?._id ? String(req.user._id) : 'user';
        const stamp = Date.now();
        cb(null, `profile_${userId}_${stamp}${safeExt}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (!file || !file.mimetype) {
        const err = new Error('Invalid file upload');
        err.statusCode = 400;
        return cb(err);
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
        const err = new Error('Only JPEG, PNG, or WEBP images are allowed');
        err.statusCode = 400;
        return cb(err);
    }
    return cb(null, true);
};

const uploadProfilePhoto = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});

module.exports = {
    uploadProfilePhoto,
    PROFILE_UPLOAD_DIR,
    KYC_UPLOAD_DIR,
    createKycUploader: () => multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, KYC_UPLOAD_DIR),
            filename: (req, file, cb) => {
                const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
                const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
                const userId = req.user?._id ? String(req.user._id) : 'user';
                const stamp = Date.now();
                cb(null, `kyc_${userId}_${stamp}_${Math.round(Math.random() * 1e6)}${safeExt}`);
            }
        }),
        fileFilter,
        limits: { fileSize: 3 * 1024 * 1024 }
    })
};
