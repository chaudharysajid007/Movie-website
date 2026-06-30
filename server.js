const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); 
require('dotenv').config();

const contentRoutes = require('./routes/contentRoutes');

const app = express();

// Trust proxy settings (CRITICAL for Heroku to read real client IPs correctly)
app.set('trust proxy', true);

// Middleware 
app.use(express.json());
app.use(cors());

// Hardened Brute-Force Gatekeeper: 3 wrong attempts = 30-minute lockdown
const passwordVerifyLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, 
  max: 3, 
  handler: (req, res) => {
    res.status(429).json({ 
      success: false, 
      message: "🚨 BRUTE FORCE ALERT: Too many incorrect attempts. Access has been locked for 30 minutes.",
      retryAfter: 30 * 60 
    });
  },
  standardHeaders: true, 
  legacyHeaders: false,  
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

// Routes Map - This maps all nested routes inside contentRoutes to begin with /api/content
app.use('/api/content', contentRoutes);

app.get('/', (req, res) => {
  res.send('Movie Website API Engine is running perfectly online!');
});

// Production Port Binder
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
