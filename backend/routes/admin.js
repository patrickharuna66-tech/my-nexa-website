const express  = require('express');
const router   = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.use(protect, adminOnly); // All admin routes require admin role

router.get('/overview',            ctrl.getOverview);
router.get('/customers',           ctrl.getCustomers);
router.get('/customers/:id',       ctrl.getCustomer);
router.patch('/customers/:id',     ctrl.updateCustomer);
router.delete('/customers/:id',    ctrl.deleteCustomer);
router.get('/tickets',             ctrl.getAllTickets);
router.patch('/tickets/:id',       ctrl.updateTicket);
router.get('/revenue',             ctrl.getRevenue);
router.get('/analytics',           ctrl.getAnalytics);
router.get('/servers',             ctrl.getServers);
router.get('/domains',             ctrl.getAllDomains);
router.get('/plans',               ctrl.getPlans);
router.patch('/plans/:id',         ctrl.updatePlan);
router.get('/invoices',            ctrl.getAllInvoices);
router.post('/send-email',         ctrl.sendBulkEmail);

module.exports = router;
