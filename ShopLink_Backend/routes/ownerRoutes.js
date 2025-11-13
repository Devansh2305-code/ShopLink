const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Mongoose Models
const Product = require('../models/Product');
const Order = require('../models/Order');
const ShopOwner = require('../models/ShopOwner');
const Customer = require('../models/Customer');

// Middleware for authentication and authorization
const auth = require('../middleware/auth');

// --- PRODUCT MANAGEMENT (CRUD) ---

// Endpoint: GET /api/owner/products - View all products for the logged-in shop
router.get('/products', auth, async (req, res) => {
    // Ensure only Shop Owners can access this route
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: 'Access denied. Must be a shop owner.' });
    }

    try {
        const products = await Product.find({ shopId: req.user.id });
        res.json(products);
    } catch (error) {
        console.error("GET Products Error:", error.message);
        res.status(500).json({ message: 'Server error retrieving products.' });
    }
});

// Endpoint: POST /api/owner/products - Add a new product
router.post('/products', auth, async (req, res) => {
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        const { name, description, price, costPrice, stockQuantity, category, details } = req.body;

        // Basic validation
        if (!name || !description || !price || costPrice === undefined || !stockQuantity || !category) {
            return res.status(400).json({ message: 'Missing required product fields.' });
        }
        
        // Ensure price validation
        if (price <= 0 || costPrice < 0 || stockQuantity < 0) {
            return res.status(400).json({ message: 'Price, cost, and stock must be valid positive numbers.' });
        }

        const product = new Product({
            shopId: req.user.id,
            name,
            description,
            price,
            costPrice,
            stockQuantity,
            category,
            // Save the flexible details object, which can be {} or contain size, fabric, etc.
            details: details || {}
        });

        await product.save();
        res.status(201).json({ message: 'Product added successfully.', product });
    } catch (error) {
        console.error("POST Product Error:", error.message);
        res.status(500).json({ message: 'Server error adding product.' });
    }
});

// Endpoint: PUT /api/owner/products/:id - Update product details (including costPrice and flexible details)
router.put('/products/:id', auth, async (req, res) => {
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        const { name, description, price, costPrice, stockQuantity, category, details } = req.body;
        const productId = req.params.id;

        // Construct update object based on provided fields
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = price;
        if (costPrice !== undefined) updates.costPrice = costPrice; // Crucial for cost update
        if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
        if (category !== undefined) updates.category = category;
        if (details !== undefined) updates.details = details; // Crucial for flexible details update

        const product = await Product.findOneAndUpdate(
            { _id: productId, shopId: req.user.id }, // Find by ID AND ensure it belongs to the logged-in owner
            { $set: updates },
            { new: true, runValidators: true } // Return the updated document and run Mongoose validation
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found or access denied.' });
        }

        res.json({ message: 'Product updated successfully.', product });
    } catch (error) {
        console.error("PUT Product Error:", error.message);
        res.status(500).json({ message: 'Server error updating product.' });
    }
});

// Endpoint: DELETE /api/owner/products/:id - Delete a product
router.delete('/products/:id', auth, async (req, res) => {
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        const productId = req.params.id;

        const result = await Product.findOneAndDelete({
            _id: productId,
            shopId: req.user.id
        });

        if (!result) {
            return res.status(404).json({ message: 'Product not found or access denied.' });
        }

        res.json({ message: 'Product deleted successfully.' });
    } catch (error) {
        console.error("DELETE Product Error:", error.message);
        res.status(500).json({ message: 'Server error deleting product.' });
    }
});

// --- ORDER MANAGEMENT ---

// Endpoint: GET /api/owner/orders - View all orders for the shop
router.get('/orders', auth, async (req, res) => {
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: 'Access denied. Must be a shop owner.' });
    }

    try {
        // Find orders related to the logged-in shop owner
        const orders = await Order.find({ shopId: req.user.id })
            .sort({ orderDate: -1 }) // Sort newest first
            .lean(); // Use lean() for faster retrieval since we are modifying the output

        // 1. Get unique customer IDs from the orders
        const customerIds = orders.map(order => order.customerId);
        
        // 2. Fetch customer details
        const customers = await Customer.find({ _id: { $in: customerIds } }, 'name phone');

        // Map customer details for easy lookup
        const customerMap = new Map();
        customers.forEach(c => customerMap.set(c._id.toString(), c));

        // 3. Attach customer details to orders (Required for the report)
        const ordersWithCustomerInfo = orders.map(order => {
            const customerInfo = customerMap.get(order.customerId.toString());
            return {
                ...order,
                customerName: customerInfo ? customerInfo.name : 'N/A',
                customerPhone: customerInfo ? customerInfo.phone : 'N/A'
            };
        });

        res.json(ordersWithCustomerInfo);
    } catch (error) {
        console.error("GET Orders Error:", error.message);
        res.status(500).json({ message: 'Server error retrieving orders.' });
    }
});

// Endpoint: PUT /api/owner/orders/:id/status - Update order status
router.put('/orders/:id/status', auth, async (req, res) => {
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        const { status } = req.body;
        const orderId = req.params.id;

        if (!status || !['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId, shopId: req.user.id }, // Find by ID AND owner
            { $set: { status } },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found or access denied.' });
        }

        res.json({ message: `Order status updated to ${status}.`, order });
    } catch (error) {
        console.error("PUT Order Status Error:", error.message);
        res.status(500).json({ message: 'Server error updating order status.' });
    }
});


// --- ANALYTICS (Sales & Profit) ---

// Endpoint: GET /api/owner/analytics/sales - Monthly profit/sales analysis
router.get('/analytics/sales', auth, async (req, res) => {
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        // MongoDB Aggregation Pipeline for Monthly Sales Analysis
        const analysis = await Order.aggregate([
            // 1. Filter orders for the logged-in shop and only delivered status
            { $match: { 
                shopId: new mongoose.Types.ObjectId(req.user.id),
                status: 'Delivered'
            }},

            // 2. Deconstruct the items array to calculate values per item
            { $unwind: "$items" },

            // 3. Calculate metrics for each item line
            { $addFields: {
                revenue: { $multiply: ["$items.quantity", "$items.sellingPrice"] },
                costOfGoods: { $multiply: ["$items.quantity", "$items.costPrice"] },
                month: { $month: "$orderDate" },
                year: { $year: "$orderDate" }
            }},

            // 4. Group by Month and Year to calculate totals
            { $group: {
                _id: { month: "$month", year: "$year" },
                totalRevenue: { $sum: "$revenue" },
                totalCost: { $sum: "$costOfGoods" },
                count: { $sum: 1 }
            }},

            // 5. Calculate Profit
            { $addFields: {
                totalProfit: { $subtract: ["$totalRevenue", "$totalCost"] }
            }},

            // 6. Sort results by year and month (latest first)
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        res.json(analysis);

    } catch (error) {
        console.error("Analytics Sales Error:", error.message);
        res.status(500).json({ message: 'Server error retrieving sales analytics.' });
    }
});

// Endpoint: GET /api/owner/analytics/details - Details of products sold (with customer data)
router.get('/analytics/details', auth, async (req, res) => {
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: 'Access denied.' });
    }

    try {
        // Fetch delivered orders for the shop
        const orders = await Order.find({ shopId: req.user.id, status: 'Delivered' })
            .sort({ orderDate: -1 })
            .lean();

        // 1. Get all unique customer IDs
        const customerIds = orders.map(order => order.customerId);
        
        // 2. Fetch customer details
        const customers = await Customer.find({ _id: { $in: customerIds } }, 'name phone');
        const customerMap = new Map();
        customers.forEach(c => customerMap.set(c._id.toString(), { name: c.name, phone: c.phone }));

        // 3. Flatten and enrich order data
        let soldDetails = [];

        orders.forEach(order => {
            const customerInfo = customerMap.get(order.customerId.toString()) || { name: 'N/A', phone: 'N/A' };

            order.items.forEach(item => {
                const revenue = item.quantity * item.sellingPrice;
                const cost = item.quantity * item.costPrice;
                const profit = revenue - cost;

                soldDetails.push({
                    orderId: order._id,
                    orderDate: order.orderDate,
                    productName: item.name,
                    quantitySold: item.quantity,
                    sellingPrice: item.sellingPrice,
                    costPrice: item.costPrice,
                    revenue: revenue.toFixed(2),
                    profit: profit.toFixed(2),
                    customerId: order.customerId,
                    customerName: customerInfo.name,
                    customerPhone: customerInfo.phone
                });
            });
        });

        res.json(soldDetails);

    } catch (error) {
        console.error("Analytics Details Error:", error.message);
        res.status(500).json({ message: 'Server error retrieving detailed sales analytics.' });
    }
});


module.exports = router;