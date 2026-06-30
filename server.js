const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // Imported rate limiter package
require('dotenv').config();

const contentRoutes = require('./routes/contentRoutes');

const app = express();

// Middleware 
app.use(express.json());
app.use(cors());

// Fix #5: Brute-Force Gatekeeper (Rate Limiting for password validation endpoint)
// Restricts IPs to a maximum of 5 password verification attempts per 15 minutes
const passwordVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, 
  message: { 
    message: "🚨 TOO MANY ATTEMPTS: Your access has been locked for 15 minutes. Please try again later." 
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

// Secure Extraction
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error("❌ CRITICAL ERROR: MONGODB_URI is undefined inside production settings.");
}

// Modernized Cloud Connection Engine
mongoose.connect(mongoURI)
  .then(() => console.log('🚀 SUCCESS: Connected to MongoDB Cloud Database!'))
  .catch(err => {
    console.error('🔥 CRITICAL MONGO CONNECTION FAILURE:');
    console.error(err.message);
    console.error(err.stack);
  });

// Apply specific rate limiting to your password verification endpoint route
app.use('/api/content/verify-password', passwordVerifyLimiter);

// Routes Map
app.use('/api/content', contentRoutes);

app.get('/', (req, res) => {
  res.send('Movie Website API Engine is running perfectly online!');
});

// Production Port Binder
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
