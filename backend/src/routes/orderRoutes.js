const express = require('express');
const { checkout, getOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/checkout', protect, checkout);
router.get('/', protect, getOrders);

module.exports = router;
