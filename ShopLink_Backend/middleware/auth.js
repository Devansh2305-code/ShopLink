const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// Middleware to verify the JWT token included in the request header
const auth = (req, res, next) => {
    // 1. Token should be in the format: "Bearer <token>"
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        // 401 Unauthorized: The user must be logged in to proceed
        return res.status(401).json({ message: 'Access denied. Please log in.' });
    }

    try {
        // 2. Verify the token using the secret key from your .env file
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Attach the decoded user payload (id, type) to the request object
        // req.user contains { id: userObjectId, type: 'customer' | 'owner' }
        req.user = decoded; 
        
        // 4. Move on to the route handler
        next();
    } catch (ex) {
        // 400 Bad Request: Token is invalid (expired, fake, etc.)
        res.status(400).json({ message: 'Invalid token. Session may have expired.' });
    }
};

module.exports = auth;