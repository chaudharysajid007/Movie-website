const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const { fetchFromTMDb } = require('../utils/tmdb');
const crypto = require('crypto'); // Built-in Node crypto module

// Helper to easily check Admin Passwords across admin routes
const verifyAdminSession = (req, res) => {
  const clientPassword = req.headers['x-admin-password'];
  const secureMasterPassword = process.env.ADMIN_PASSWORD;
  return clientPassword && clientPassword === secureMasterPassword;
};

/**
 * 🔒 HELPER: Encrypt Real URLs into Temporary 11-Hour Tokens
 * Encrypts Driveseed URLs bound tightly to the visitor's IP address.
 */
function encryptUrl(realUrl, userIp) {
  if (!realUrl) return "";
  try {
    const secret = process.env.LINK_SECRET || "sajidflix_ultra_secure_key_123";
    const expiresAt = Date.now() + (11 * 60 * 60 * 1000); // 🕒 11 Hours from right now
    
    const payload = JSON.stringify({ url: realUrl, ip: userIp, expires: expiresAt });
    
    const key = crypto.scryptSync(secret, 'salt', 32);
    const iv = Buffer.alloc(16, 0); // Flat initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let token = cipher.update(payload, 'utf8', 'hex');
    token += cipher.final('hex');
    
    return `/api/content/download/${token}`;
  } catch (err) {
    console.error("Encryption Failure:", err.message);
    return realUrl; // Fallback to raw link if crypto fails
  }
}

// ==========================================
// USER PANEL ROUTES (Public Access via TMDb)
// ==========================================

// 1. Homepage Catalog: Fetches items with explicit database-layer optimization
router.get('/', async (req, res) => {
  try {
    const { type } = req.query; 
    
    const filterQuery = {};
    if (type === 'movie' || type === 'series') {
      filterQuery.type = type;
    }

    const localItems = await Content.find(filterQuery).sort({ createdAt: -1 });
    
    const richItems = await Promise.all(localItems.map(async (item) => {
      const endpoint = item.type === 'series' ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;
      const meta = await fetchFromTMDb(endpoint);
      if (!meta) return null;
      
      return {
        _id: item.tmdbId,
        title: meta.title || meta.name,
        type: item.type,
        coverImageUrl: `https://image.tmdb.org/t/p/w500${meta.poster_path}`
      };
    }));

    res.json(richItems.filter(i => i !== null));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Real-time Search Route
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const movieData = await fetchFromTMDb('/search/movie', `&query=${encodeURIComponent(q)}`);
    const tvData = await fetchFromTMDb('/search/tv', `&query=${encodeURIComponent(q)}`);

    const results = [];

    if (movieData && movieData.results) {
      movieData.results.forEach(m => {
        if (!m.poster_path) return;
        results.push({
          _id: m.id.toString(),
          title: m.title,
          type: 'movie',
          coverImageUrl: `https://image.tmdb.org/t/p/w500${m.poster_path}`
        });
      });
    }

    if (tvData && tvData.results) {
      tvData.results.forEach(t => {
        if (!t.poster_path) return;
        results.push({
          _id: t.id.toString(),
          title: t.name,
          type: 'series',
          coverImageUrl: `https://image.tmdb.org/t/p/w500${t.poster_path}`
        });
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Get Single Item Details (🔒 SWAPS REAL DRIborderColor SEED LINKS WITH TEMPORARY TOKEN GATEWAYS)
router.get('/:id', async (req, res) => {
  const tmdbId = req.params.id;
  const { type } = req.query; 
  
  try {
    const endpoint = type === 'series' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    const metadata = await fetchFromTMDb(endpoint, "&append_to_response=images");

    if (!metadata) return res.status(404).json({ message: 'Title details not found globally' });

    const localRecord = await Content.findOne({ tmdbId: tmdbId.toString() });

    let backdrops = [];
    if (metadata.images && metadata.images.backdrops) {
      backdrops = metadata.images.backdrops.slice(0, 4).map(b => `https://image.tmdb.org/t/p/w780${b.file_path}`);
    }

    // Capture the client's actual current visitor IP address
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    let secureMovieLinks = [];
    let secureSeasons = [];

    // ✨ AUTOMATIC LINK PROTECTION HOOKS
    if (localRecord) {
      if (localRecord.movieLinks && localRecord.movieLinks.length > 0) {
        secureMovieLinks = localRecord.movieLinks.map(link => ({
          resolution: link.resolution,
          // Hide real Driveseed URL completely behind token
          downloadUrl: encryptUrl(link.downloadUrl, clientIp) 
        }));
      }

      if (localRecord.seasons && localRecord.seasons.length > 0) {
        secureSeasons = localRecord.seasons.map(season => ({
          seasonNumber: season.seasonNumber,
          resolutions: season.resolutions.map(res => ({
            resolution: res.resolution,
            batchLink: res.batchLink ? encryptUrl(res.batchLink, clientIp) : null,
            episodes: res.episodes.map(ep => ({
              episodeNumber: ep.episodeNumber,
              downloadUrl: encryptUrl(ep.downloadUrl, clientIp) // Safe episode paths
            }))
          }))
        }));
      }
    }

    res.json({
      _id: tmdbId,
      title: metadata.title || metadata.name,
      description: metadata.overview,
      coverImageUrl: `https://image.tmdb.org/t/p/w500${metadata.poster_path}`,
      screenshots: backdrops,
      type: type === 'series' ? 'series' : 'movie',
      movieLinks: secureMovieLinks, // Returns safe, encrypted tokens only
      seasons: secureSeasons,       // Returns safe, encrypted tokens only
      hasLinks: !!localRecord 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 📬 TELEGRAM CONTENT REQUEST NOTIFICATION ROUTE
router.post('/request/:id', async (req, res) => {
  const tmdbId = req.params.id;
  const { title, type } = req.body;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ message: "Notification server variables misconfigured" });
  }

  const alertMessage = `🚨 *New Sajidflix Content Request!*\n\n` +
                       `🎬 *Title:* ${title}\n` +
                       `🏷️ *Type:* ${type.toUpperCase()}\n` +
                       `🆔 *Database ID:* \`${tmdbId}\`\n\n` +
                       `👉 _Go to your Admin Panel, create an entry with this ID and attach your download links!_`;

  try {
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: alertMessage,
        parse_mode: 'Markdown'
      })
    });

    res.json({ success: true, message: "Request successfully sent to admin!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to broadcast notification", error: err.message });
  }
});

// ==========================================
// ADMIN PANEL ROUTES (Management Operations)
// ==========================================

router.post('/add', async (req, res) => {
  if (!verifyAdminSession(req, res)) {
    return res.status(401).json({ message: "Unauthorized: Invalid Admin Password" });
  }

  const item = new Content({
    tmdbId: req.body.tmdbId, 
    type: req.body.type,
    movieLinks: req.body.movieLinks, 
    seasons: req.body.seasons        
  });

  try {
    const newItem = await item.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/edit/:id', async (req, res) => {
  if (!verifyAdminSession(req, res)) {
    return res.status(401).json({ message: "Unauthorized: Invalid Admin Password" });
  }

  try {
    const updatedItem = await Content.findOneAndUpdate(
      { tmdbId: req.params.id }, 
      req.body, 
      { new: true } 
    );
    if (!updatedItem) return res.status(404).json({ message: 'Content not found' });
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/delete/:id', async (req, res) => {
  if (!verifyAdminSession(req, res)) {
    return res.status(401).json({ message: "Unauthorized: Invalid Admin Password" });
  }

  try {
    const item = await Content.findOneAndDelete({ tmdbId: req.params.id });
    if (!item) return res.status(404).json({ message: 'Content not found' });
    res.json({ message: 'Download configuration dropped successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify-password', (req, res) => {
  const { password } = req.body;
  const secureMasterPassword = process.env.ADMIN_PASSWORD;

  if (password && password === secureMasterPassword) {
    return res.json({ success: true, message: "Access Granted" });
  } else {
    return res.status(401).json({ success: false, message: "Invalid Password" });
  }
});

module.exports = router;
