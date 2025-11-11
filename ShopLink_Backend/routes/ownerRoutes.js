const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Needed for ObjectId in aggregation
const authMiddleware = require('../middleware/auth');
const Product = require('../models/Product'); 
const Order = require('../models/Order');     
const ShopOwner = require('../models/ShopOwner');

// Apply middleware: ALL routes in this file require an authenticated token
router.use(authMiddleware); 

// Middleware to ensure the user is a shop owner
const isOwner = (req, res, next) => {
    if (req.user.type !== 'owner') {
        return res.status(403).json({ message: "Forbidden: This resource is for Shop Owners only." });
    }
    next();
};

router.use(isOwner);

// --- BEGIN SHOP OWNER ROUTES: PRODUCT MANAGEMENT (CRUD) ---

// Endpoint: GET /api/owner/products - View all products for the logged-in shop
router.get('/products', async (req, res) => {
    try {
        const shopId = req.user.id; 
        const products = await Product.find({ shopId }).sort({ name: 1 });

        res.json({ success: true, count: products.length, products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: "Server error fetching products." });
    }
});

// Endpoint: POST /api/owner/products - Add a new product
router.post('/products', async (req, res) => {
    try {
        const { name, description, price, costPrice, stockQuantity } = req.body;
        const shopId = req.user.id;

        if (!name || !price || !costPrice || stockQuantity === undefined) {
             return res.status(400).json({ message: "Missing required product fields." });
        }

        const newProduct = new Product({
            shopId,
            name,
            description,
            price,
            costPrice,
            stockQuantity: stockQuantity
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: "Product added successfully.", product: newProduct });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(400).json({ message: "Failed to add product. Check data validity." });
    }
});

// Endpoint: PUT /api/owner/products/:id - Update product details or stock
router.put('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const shopId = req.user.id;
        const updates = req.body;

        // Find and ensure the product belongs to the logged-in shop owner
        const product = await Product.findOneAndUpdate(
            { _id: productId, shopId: shopId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ message: "Product not found or does not belong to this shop." });
        }

        res.json({ success: true, message: "Product updated successfully.", product });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(400).json({ message: "Failed to update product. Check data validity." });
    }
});

// Endpoint: DELETE /api/owner/products/:id - Delete a product
router.delete('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const shopId = req.user.id;

        const result = await Product.findOneAndDelete({ _id: productId, shopId: shopId });

        if (!result) {
            return res.status(404).json({ message: "Product not found or does not belong to this shop." });
        }

        res.json({ success: true, message: "Product deleted successfully." });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: "Server error deleting product." });
    }
});


// --- BEGIN SHOP OWNER ROUTES: ORDER & ANALYTICS ---

// Endpoint: GET /api/owner/orders - View all orders for the shop
router.get('/orders', async (req, res) => {
    try {
        const shopId = req.user.id;
        
        // Fetch orders and populate customer data (name and phone)
        const orders = await Order.find({ shopId })
            .populate('customerId', 'name phone') 
            .sort({ orderDate: -1 });
            
        // Map to format the output for cleaner use in the frontend
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderDate: order.orderDate,
            status: order.status,
            totalAmount: order.totalAmount,
            items: order.items,
            customerName: order.customerId ? order.customerId.name : 'Unknown',
            customerContact: order.customerId ? order.customerId.phone : 'N/A'
        }));

        res.json({ success: true, orders: formattedOrders, message: "Orders list fetched successfully." });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: "Server error fetching orders." });
    }
});

// Endpoint: PUT /api/owner/orders/:id/status - Update order status
router.put('/orders/:id/status', async (req, res) => {
    try {
        const orderId = req.params.id;
        const shopId = req.user.id;
        const { status } = req.body; // Expects status: 'Processing', 'Shipped', etc.

        const order = await Order.findOneAndUpdate(
            { _id: orderId, shopId: shopId },
            { $set: { status: status } },
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({ message: "Order not found or does not belong to this shop." });
        }

        res.json({ success: true, message: `Order status updated to ${order.status}`, order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(400).json({ message: "Failed to update order status." });
    }
});


// Analytics: GET /api/owner/analytics/sales - Monthly profit/sales analysis
router.get('/analytics/sales', async (req, res) => {
    try {
        const shopId = mongoose.Types.ObjectId(req.user.id);

        const sales = await Order.aggregate([
            { $match: { shopId: shopId, status: "Delivered" } }, // Only analyze completed sales
            { $unwind: "$items" }, // Deconstruct the items array
            {
                $group: {
                    _id: {
                        month: { $month: "$orderDate" },
                        year: { $year: "$orderDate" }
                    },
                    totalRevenue: { $sum: { $multiply: ["$items.sellingPrice", "$items.quantity"] } },
                    totalProfit: { $sum: { $multiply: ["$items.quantity", { $subtract: ["$items.sellingPrice", "$items.costPrice"] }] } },
                    totalItemsSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        res.json({ success: true, sales, message: "Monthly sales analysis fetched." });
    } catch (error) {
        console.error('Error fetching sales analytics:', error);
        res.status(500).json({ message: "Server error fetching sales analytics." });
    }
});


// Analytics: GET /api/owner/analytics/details - Details of products sold (with customer data)
router.get('/analytics/details', async (req, res) => {
    try {
        const shopId = mongoose.Types.ObjectId(req.user.id);

        const details = await Order.aggregate([
            { $match: { shopId: shopId, status: "Delivered" } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: 'customers', // The target collection name (lowercase and plural)
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customerInfo'
                }
            },
            { $unwind: "$customerInfo" },
            {
                $project: {
                    _id: 0,
                    orderId: "$_id",
                    productName: "$items.name",
                    quantity: "$items.quantity",
                    profit: { $multiply: ["$items.quantity", { $subtract: ["$items.sellingPrice", "$items.costPrice"] }] },
                    customerName: "$customerInfo.name",
                    customerPhone: "$customerInfo.phone"
                }
            },
            { $sort: { orderId: -1 } }
        ]);

        res.json({ success: true, details, message: "Detailed sales data fetched." });
    } catch (error) {
        console.error('Error fetching detailed analytics:', error);
        res.status(500).json({ message: "Server error fetching detailed analytics." });
    }
});

// --- END SHOP OWNER ROUTES ---

module.exports = router;