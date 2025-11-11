const mongoose = require('mongoose');

// Define the schema for items within the order array (Sub-document)
const OrderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: String,
    quantity: Number,
    sellingPrice: Number, // Price at the time of purchase
    costPrice: Number,     // Cost at the time of purchase (for analytics)
}, { _id: false }); 

// Schema based on the Order Collection
const OrderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer', // Links to the Customer collection
        required: true
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopOwner', // Links to the ShopOwner collection
        required: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    items: {
        type: [OrderItemSchema], // Array of purchased items
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Order', OrderSchema);