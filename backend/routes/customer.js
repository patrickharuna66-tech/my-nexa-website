const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/customerController');

router.use(protect); // All customer routes require auth

router.get('/account',         ctrl.getAccount);
router.get('/websites',        ctrl.getWebsites);
router.get('/emails',          ctrl.getEmails);
router.get('/databases',       ctrl.getDatabases);
router.get('/domains',         ctrl.getDomains);
router.get('/invoices',        ctrl.getInvoices);
router.get('/tickets',         ctrl.getTickets);
router.post('/tickets',        ctrl.createTicket);
router.patch('/tickets/:id',   ctrl.replyTicket);
router.get('/usage',           ctrl.getUsage);
router.patch('/settings',      ctrl.updateSettings);
router.post('/change-password',ctrl.changePassword);

module.exports = router;
