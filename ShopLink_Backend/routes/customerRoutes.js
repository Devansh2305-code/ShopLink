const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Mongoose Models
const Product = require('../models/Product');
const Order = require('../models/Order');
const ShopOwner = require('../models/ShopOwner');
const Customer = require('../models/Customer');

// Middleware for authentication
const auth = require('../middleware/auth');

// --- BROWSING & SEARCH ---

// Endpoint: GET /api/customer/shops - Browse all registered shops
router.get('/shops', auth, async (req, res) => {
    if (req.user.type !== 'customer') {
        return res.status(403).json({ message: 'Access denied. Must be a customer.' });
    }
    
    try {
        // Only return necessary public shop details
        const shops = await ShopOwner.find({}, 'shopName category ownerName phone');
        res.json(shops);
    } catch (error) {
        console.error("GET Shops Error:", error.message);
        res.status(500).json({ message: 'Server error retrieving shops.' });
    }
});

// Endpoint: GET /api/customer/shops/:shopId/products - View products from a specific shop
router.get('/shops/:shopId/products', auth, async (req, res) => {
    if (req.user.type !== 'customer') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        const shopId = req.params.shopId;
        
        // Find products belonging to the specified shop ID. Only return public fields.
        const products = await Product.find({ shopId: shopId, stockQuantity: { $gt: 0 } }, 'shopId name description category price stockQuantity details');
        
        res.json(products);
    } catch (error) {
        console.error("GET Shop Products Error:", error.message);
        res.status(500).json({ message: 'Server error retrieving products for shop.' });
    }
});

// Endpoint: GET /api/customer/products/search - Search products by category or name
router.get('/products/search', auth, async (req, res) => {
    if (req.user.type !== 'customer') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    
    try {
        const { query, category } = req.query;
        let filter = {};

        if (query) {
            // Case-insensitive search on name or description
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ];
        }

        if (category) {
            filter.category = category;
        }

        // Only return products that have stock > 0
        filter.stockQuantity = { $gt: 0 }; 

        const products = await Product.find(filter, 'shopId name description category price stockQuantity details');
        res.json(products);
    } catch (error) {
        console.error("Search Products Error:", error.message);
        res.status(500).json({ message: 'Server error during product search.' });
    }
});


// --- ORDER & CHECKOUT ---

// Endpoint: POST /api/customer/checkout - Finalize order (Payment Simulation & Stock Deduction)
router.post('/checkout', auth, async (req, res) => {
    if (req.user.type !== 'customer') {
        return res.status(403).json({ message: 'Access denied. Must be a customer.' });
    }

    // items array: [{ productId, quantity, shopId }]
    // NOTE: In the final Firebase integration, the frontend will manage the cart and send final items here.
    const { cartItems, totalAmount, paymentDetails } = req.body; 
    const customerId = req.user.id;
    
    // 1. Payment Gateway Simulation
    // This assumes successful payment before proceeding.
    if (!paymentDetails || paymentDetails.status !== 'success') {
         return res.status(400).json({ message: 'Payment failed or details missing.' });
    }


    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Group items by shop to create separate orders
        const ordersByShop = cartItems.reduce((acc, item) => {
            const shopIdStr = item.shopId.toString();
            if (!acc[shopIdStr]) {
                acc[shopIdStr] = {
                    shopId: item.shopId,
                    items: [],
                    totalAmount: 0,
                    totalCost: 0
                };
            }
            acc[shopIdStr].items.push(item);
            return acc;
        }, {});


        const newOrders = [];
        const stockUpdates = [];

        for (const shopId in ordersByShop) {
            const shopOrder = ordersByShop[shopId];
            let currentShopTotal = 0;

            // 3. Validate stock and get current prices/costs
            for (const item of shopOrder.items) {
                const product = await Product.findById(item.productId).session(session);

                if (!product || product.stockQuantity < item.quantity) {
                    await session.abortTransaction();
                    return res.status(400).json({ message: `Insufficient stock for product: ${item.name || item.productId}` });
                }

                // Add to total
                currentShopTotal += item.quantity * product.price;

                // Prepare order item structure with current prices
                // The frontend should ideally send name/costPrice, but we fetch current price for security/accuracy
                item.sellingPrice = product.price; 
                item.costPrice = product.costPrice;
                item.name = product.name; // Ensure product name is in the order item

                // Prepare stock update operation
                stockUpdates.push({
                    updateOne: {
                        filter: { _id: item.productId },
                        update: { $inc: { stockQuantity: -item.quantity } }
                    }
                });
            }
            
            // Re-calculate the total based on current prices, not client-provided totalAmount
            const calculatedTotal = shopOrder.items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);


            // 4. Create the Order document for this shop
            const newOrder = new Order({
                customerId: customerId,
                shopId: shopOrder.shopId,
                totalAmount: calculatedTotal, 
                items: shopOrder.items
            });

            newOrders.push(newOrder);
        }
        
        // 5. Execute Stock Deductions
        if (stockUpdates.length > 0) {
            await Product.bulkWrite(stockUpdates, { session });
        }

        // 6. Save all new Orders
        await Order.insertMany(newOrders, { session });

        await session.commitTransaction();
        session.endSession();

        // 7. Respond Success
        res.status(201).json({ 
            message: 'Order placed successfully. Stock deducted and orders created.', 
            ordersCount: newOrders.length 
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Checkout Error:", error.message);
        res.status(500).json({ message: 'Server error during checkout process.' });
    }
});


// Endpoint: GET /api/customer/orders - View customer's order history
router.get('/orders', auth, async (req, res) => {
    if (req.user.type !== 'customer') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        const orders = await Order.find({ customerId: req.user.id })
            .sort({ orderDate: -1 }) // Sort by newest first
            .lean(); // Use lean for performance

        // 1. Get unique shop IDs
        const shopIds = orders.map(order => order.shopId);
        
        // 2. Fetch shop names for display
        const shops = await ShopOwner.find({ _id: { $in: shopIds } }, 'shopName');
        
        // Map shop names for easy lookup
        const shopMap = new Map();
        shops.forEach(s => shopMap.set(s._id.toString(), s.shopName));

        // 3. Attach shop names to orders
        const ordersWithShopInfo = orders.map(order => {
            const shopName = shopMap.get(order.shopId.toString());
            return {
                ...order,
                shopName: shopName || 'N/A'
            };
        });

        res.json(ordersWithShopInfo);
    } catch (error) {
        console.error("GET Customer Orders Error:", error.message);
        res.status(500).json({ message: 'Server error retrieving order history.' });
    }
});


module.exports = router;