const mongoose = require('mongoose');

// Schema based on the Product Collection
const ProductSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopOwner',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: { // New explicit category field for flexible input logic
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0.01
    },
    costPrice: { // Internal cost for profit calculation
        type: Number,
        required: true,
        min: 0
    },
    stockQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    // Flexible details field: Stores category-specific attributes (e.g., { sizes: 'S, M, L', fabric: 'Cotton' })
    details: { 
        type: Object,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);