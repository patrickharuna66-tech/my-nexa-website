const express = require('express');
const router  = express.Router();

// Payment webhooks - raw body needed for signature verification
router.post('/stripe',
  express.raw({ type: 'application/json' }),
  require('../controllers/webhookController').stripeWebhook
);

router.post('/flutterwave',
  express.json(),
  require('../controllers/webhookController').flutterwaveWebhook
);

module.exports = router;
