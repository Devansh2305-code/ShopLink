const mongoose = require('mongoose');

// Schema based on the Customer Collection
const CustomerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        min: 16, 
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
    address: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true, // Used for login
        trim: true,
        match: /^\d{10}$/ // Simple check for a 10-digit number 
    },
    passwordHash: { // Stores the encrypted password
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Customer', CustomerSchema);