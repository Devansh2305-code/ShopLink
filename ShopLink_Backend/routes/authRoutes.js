const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const Customer = require('../models/Customer');
const ShopOwner = require('../models/ShopOwner');

// Utility function to generate JWT
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// --- BEGIN AUTHENTICATION ROUTES ---

// Endpoint: POST /api/auth/customer/register
router.post('/customer/register', async (req, res) => {
    try {
        const { name, age, gender, address, phone, password } = req.body;

        if (!phone || !password || !name || !address) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        let customer = await Customer.findOne({ phone });
        if (customer) {
            return res.status(400).json({ message: "Customer with this phone number already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        customer = new Customer({
            name, age, gender, address, phone, passwordHash 
        });

        await customer.save();

        res.status(201).json({ message: "Customer registered successfully. Please log in." });
    } catch (error) {
        console.error("Customer Registration Error:", error.message);
        res.status(500).json({ message: "Server error during registration. Check phone format or missing fields." });
    }
});

// Endpoint: POST /api/auth/customer/login
router.post('/customer/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        const customer = await Customer.findOne({ phone });
        if (!customer) {
            return res.status(400).json({ message: "Invalid credentials." });
        }

        const isMatch = await bcrypt.compare(password, customer.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials." });
        }

        const token = generateToken({ 
            id: customer._id, 
            type: 'customer'
        });
        
        res.json({ 
            token, 
            user: { id: customer._id, name: customer.name, phone: customer.phone },
            message: "Customer login successful." 
        });
    } catch (error) {
        console.error("Customer Login Error:", error.message);
        res.status(500).json({ message: "Server error during login." });
    }
});


// Endpoint: POST /api/auth/owner/register
router.post('/owner/register', async (req, res) => {
    try {
        const { shopName, ownerName, registrationId, category, phone, password } = req.body;

        if (!registrationId || !password || !shopName || !ownerName || !category || !phone) {
            return res.status(400).json({ message: "Missing required shop owner fields." });
        }

        let owner = await ShopOwner.findOne({ $or: [{ registrationId }, { shopName }] });
        if (owner) {
            return res.status(400).json({ message: "Shop Name or Registration ID already registered." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        owner = new ShopOwner({
            shopName, ownerName, registrationId, category, phone, passwordHash
        });

        await owner.save();

        res.status(201).json({ message: "Shop Owner registered successfully. Please log in." });
    } catch (error) {
        console.error("Owner Registration Error:", error.message);
        res.status(500).json({ message: "Server error during owner registration. Check unique fields or phone format." });
    }
});

// Endpoint: POST /api/auth/owner/login
router.post('/owner/login', async (req, res) => {
    try {
        const { registrationId, password } = req.body;

        const owner = await ShopOwner.findOne({ registrationId });
        if (!owner) {
            return res.status(400).json({ message: "Invalid credentials." });
        }

        const isMatch = await bcrypt.compare(password, owner.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials." });
        }

        const token = generateToken({ 
            id: owner._id, 
            type: 'owner'
        });
        
        res.json({ 
            token, 
            user: { id: owner._id, shopName: owner.shopName, registrationId: owner.registrationId },
            message: "Shop Owner login successful." 
        });
    } catch (error) {
        console.error("Owner Login Error:", error.message);
        res.status(500).json({ message: "Server error during login." });
    }
});

// --- END AUTHENTICATION ROUTES ---

module.exports = router;