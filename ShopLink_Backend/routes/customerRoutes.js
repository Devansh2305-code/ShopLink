const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); 
const ShopOwner = require('../models/ShopOwner'); 
const Product = require('../models/Product');     
const Order = require('../models/Order');         

// Apply middleware: ALL routes in this file require an authenticated token
router.use(authMiddleware); 

// Middleware to ensure the user is a customer
const isCustomer = (req, res, next) => {
    if (req.user.type !== 'customer') {
        return res.status(403).json({ message: "Forbidden: This resource is for Customers only." });
    }
    next();
};

router.use(isCustomer);


// --- BEGIN CUSTOMER ROUTES ---

// Browse Shops: GET /api/customer/shops
router.get('/shops', async (req, res) => {
    try {
        // Return only public shop details
        const shops = await ShopOwner.find({}, 'shopName category');
        res.json({ success: true, count: shops.length, shops });
    } catch (error) {
        console.error('Error fetching shops:', error);
        res.status(500).json({ message: "Server error fetching shops." });
    }
});

// Browse Products by Shop: GET /api/customer/shops/:shopId/products
router.get('/shops/:shopId/products', async (req, res) => {
    try {
        const shopId = req.params.shopId;
        
        // Find products for that shop, showing only in-stock items, excluding internal costPrice
        const products = await Product.find({ 
            shopId: shopId, 
            stockQuantity: { $gt: 0 } 
        }, 'name description price stockQuantity'); 

        res.json({ success: true, count: products.length, products });
    } catch (error) {
        console.error('Error fetching products by shop:', error);
        res.status(500).json({ message: "Server error fetching products." });
    }
});

// Search Products: GET /api/customer/products/search?q=query&category=cat
router.get('/products/search', async (req, res) => {
    try {
        const { q, category } = req.query;
        let query = { stockQuantity: { $gt: 0 } };

        if (q) {
            const regex = new RegExp(q, 'i');
            query.$or = [{ name: regex }, { description: regex }];
        }

        if (category) {
            // 1. Find shop IDs matching the category
            const shops = await ShopOwner.find({ category: new RegExp(category, 'i') }, '_id');
            const shopIds = shops.map(s => s._id);
            // 2. Filter products by those shop IDs
            query.shopId = { $in: shopIds };
        }

        const products = await Product.find(query, 'name description price stockQuantity');

        res.json({ success: true, count: products.length, products });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ message: "Server error during search." });
    }
});


// Cart Management: POST /api/customer/cart (Placeholder)
router.post('/cart', (req, res) => {
    // Note: A real cart system would likely use Redis or a temporary Cart collection in MongoDB
    res.status(501).json({ message: "Cart management not implemented yet. Use checkout directly for testing." });
});

// Checkout: POST /api/customer/checkout
router.post('/checkout', async (req, res) => {
    try {
        const customerId = req.user.id;
        const { cartItems } = req.body; // Expects cartItems: [{ productId, quantity }]

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty." });
        }

        let totalAmount = 0;
        let shopIdMap = new Map(); 

        // 1. Validate items, check stock, and calculate total
        for (const item of cartItems) {
            const product = await Product.findById(item.productId);

            if (!product || product.stockQuantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for product: ${product?.name || item.productId}` });
            }

            // Group items by shopId (for multi-vendor functionality)
            const shopId = product.shopId.toString();
            if (!shopIdMap.has(shopId)) {
                shopIdMap.set(shopId, []);
            }
            shopIdMap.get(shopId).push({ product, quantity: item.quantity });
            
            totalAmount += product.price * item.quantity;
        }

        // --- Payment Gateway Simulation ---
        // Assume payment is successful here. In a real app, this would be an external API call.
        
        const ordersCreated = [];

        // 2. Create an order and update stock for EACH unique shop in the cart
        for (const [shopId, items] of shopIdMap.entries()) {
            
            const orderItemsForShop = items.map(cartItem => ({
                productId: cartItem.product._id,
                name: cartItem.product.name,
                quantity: cartItem.quantity,
                sellingPrice: cartItem.product.price,
                costPrice: cartItem.product.costPrice,
            }));

            const orderTotalForShop = orderItemsForShop.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);

            const newOrder = new Order({
                customerId,
                shopId: shopId,
                items: orderItemsForShop,
                totalAmount: orderTotalForShop,
                status: 'Processing' 
            });

            await newOrder.save();
            ordersCreated.push(newOrder._id);

            // 3. Update stock for each product in this shop's order
            for (const item of items) {
                await Product.findByIdAndUpdate(item.product._id, {
                    $inc: { stockQuantity: -item.quantity } 
                });
            }
        }
        
        res.json({ success: true, orderIds: ordersCreated, message: "Order(s) placed successfully." });

    } catch (error) {
        console.error('Checkout Error:', error);
        res.status(500).json({ message: "Server error during checkout process." });
    }
});

// Order History: GET /api/customer/orders
router.get('/orders', async (req, res) => {
    try {
        const customerId = req.user.id;
        
        // Fetch orders and populate shop data (shopName)
        const orders = await Order.find({ customerId })
            .populate('shopId', 'shopName')
            .sort({ orderDate: -1 });

        // Map to format the output for cleaner use in the frontend
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderDate: order.orderDate,
            status: order.status,
            totalAmount: order.totalAmount,
            items: order.items,
            shopName: order.shopId ? order.shopId.shopName : 'Unknown Shop'
        }));

        res.json({ success: true, orders: formattedOrders, message: "Order history fetched successfully." });
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ message: "Server error fetching order history." });
    }
});

// --- END CUSTOMER ROUTES ---

module.exports = router;