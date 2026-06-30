const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); 
const crypto = require('crypto'); // Built-in Node crypto module
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

// Routes Map
app.use('/api/content', contentRoutes);

/**
 * 🔐 DYNAMIC LINK REDIRECT GATEWAY
 * Route: GET /api/content/download/:token
 * Decrypts the link token, matches IP constraints, and checks 11-hour expiration.
 */
app.get('/api/content/download/:token', (req, res) => {
    try {
        const { token } = req.params;
        const secret = process.env.LINK_SECRET || "sajidflix_ultra_secure_key_123";
        
        // Decrypt the token payload
        const key = crypto.scryptSync(secret, 'salt', 32);
        const iv = Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        let decrypted = decipher.update(token, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        const payload = JSON.parse(decrypted);
        
        // Extract client's true IP address
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 🛡️ SECURITY CHECK 1: Expiration Lifespan (11 Hours)
        if (Date.now() > payload.expires) {
            return res.status(403).send(`
                <body style="background:#0b0f19;color:#f87171;font-family:sans-serif;text-align:center;padding-top:100px;">
                    <h1>🚨 LINK EXPIRED</h1>
                    <p style="color:#9ca3af;">This temporary download link has expired (11-hour limit exceeded). Please refresh the movie details page to request a new download path.</p>
                </body>
            `);
        }

        // 🛡️ SECURITY CHECK 2: IP Bound Locking Verification
        if (payload.ip !== clientIp) {
             return res.status(403).send(`
                <body style="background:#0b0f19;color:#f87171;font-family:sans-serif;text-align:center;padding-top:100px;">
                    <h1>🔒 ACCESS DENIED</h1>
                    <p style="color:#9ca3af;">This link is tightly locked to another IP address. Links cannot be shared across multiple devices or networks.</p>
                </body>
            `);
        }

        // ✅ All checks passed! Silently forward user straight to Driveseed
        return res.redirect(302, payload.url);

    } catch (err) {
        console.error("Link Decryption Failure:", err.message);
        return res.status(400).send(`
            <body style="background:#0b0f19;color:#f87171;font-family:sans-serif;text-align:center;padding-top:100px;">
                <h1>⚠️ INVALID DOWNLOAD REF</h1>
                <p style="color:#9ca3af;">The security token signature is broken or has been modified maliciously.</p>
            </body>
        `);
    }
});

app.get('/', (req, res) => {
  res.send('Movie Website API Engine is running perfectly online!');
});

// Production Port Binder
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
