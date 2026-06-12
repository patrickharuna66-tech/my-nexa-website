const express = require('express');
const router  = express.Router();

router.get('/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'starter', name: 'Starter Essential', price: 5.99, popular: false,
        features: ['1 Website','10 GB NVMe SSD','Unmetered Bandwidth','Free SSL','5 Email Accounts','cPanel Access','1-Click WordPress','99.9% Uptime']
      },
      {
        id: 'business', name: 'Business Growth', price: 12.99, popular: true,
        features: ['Unlimited Websites','50 GB NVMe SSD','Unmetered Bandwidth','Free SSL + Wildcard','Unlimited Email','Free Domain 1 Year','Daily Backups','Priority Support','Staging Environment']
      },
      {
        id: 'pro', name: 'Pro Enterprise', price: 19.99, popular: false,
        features: ['Unlimited Websites','200 GB NVMe SSD','Unmetered Bandwidth','Free SSL + Auto-Renew','Unlimited Email','Free Domain 1 Year','Hourly Backups','Dedicated IP','Advanced DDoS Protection','White-Glove Onboarding']
      }
    ]
  });
});

router.get('/status', (req, res) => {
  res.json({ status: 'operational', uptime: '99.97%', lastChecked: new Date().toISOString() });
});

module.exports = router;
