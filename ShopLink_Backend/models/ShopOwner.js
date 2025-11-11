const mongoose = require('mongoose');

// Schema based on the ShopOwner Collection
const ShopOwnerSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: true,
        unique: true, 
        trim: true
    },
    ownerName: {
        type: String,
        required: true,
        trim: true
    },
    registrationId: {
        type: String,
        required: true,
        unique: true, 
        trim: true
    },
    category: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        match: /^\d{10}$/ 
    },
    passwordHash: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ShopOwner', ShopOwnerSchema);