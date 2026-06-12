const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('plan').isIn(['starter','business','pro']).withMessage('Invalid plan')
  ],
  ctrl.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  ctrl.login
);

router.post('/forgot-password', body('email').isEmail(), ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);
router.get('/me',  protect, ctrl.getMe);
router.post('/logout', protect, ctrl.logout);

module.exports = router;
