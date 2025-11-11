// 1. Core Imports
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); 

// Load environment variables from .env file (make sure you create the .env file!)
dotenv.config();

// 2. Initialize App and Port
const app = express();
const PORT = process.env.PORT || 5000;

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected successfully!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));


// 4. Middleware Setup
// CORS allows frontend (port 80/index.html) to talk to backend (port 5000)
app.use(cors()); 
// Allows Express to read incoming JSON data (body parser)
app.use(express.json()); 


// 5. Route Imports
const authRoutes = require('./routes/authRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const customerRoutes = require('./routes/customerRoutes');

// 6. Define API Routes
// All routes start with /api
app.use('/api/auth', authRoutes); 
app.use('/api/owner', ownerRoutes); 
app.use('/api/customer', customerRoutes); 

// Basic root route for testing
app.get('/', (req, res) => {
    res.send('ShopLink API is running...');
});

// 7. Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});