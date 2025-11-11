const mongoose = require('mongoose');

// Schema based on the Product Collection
const ProductSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopOwner', // Links to the ShopOwner collection
        required: true,
        index: true 
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    price: { // Selling Price
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
        default: 0,
        min: 0
    }
});

module.exports = mongoose.model('Product', ProductSchema);