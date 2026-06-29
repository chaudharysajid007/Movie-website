const express = require('express');
const router = express.Router();
const Content = require('../models/Content');

// ==========================================
// USER PANEL ROUTES (Public Access)
// ==========================================

// 1. Get all entries (Homepage catalog)
router.get('/', async (req, res) => {
  try {
    const items = await Content.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Real-time Search Route (Instant letter-by-letter partial filtering)
router.get('/search', async (req, res) => {
  const { q } = req.query; // e.g., /api/content/search?q=fro
  try {
    // If the search bar is cleared, return an empty array or all items
    if (!q) {
      return res.json([]);
    }

    // $regex looks for the typed string anywhere inside the title
    // 'i' makes it case-insensitive so typing 'f' or 'F' works identically
    const results = await Content.find({
      title: { $regex: q, $options: 'i' }
    });
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 3. Get single item details (The Download Page layout data)
router.get('/:id', async (req, res) => {
  try {
    const item = await Content.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Content not found' });
    res.json(item);
  } catch (err) {
    console.error("🔥 DATABASE CRASH ERROR:", err);
    res.status(400).json({ message: err.message, error: err });
  }
});

// ==========================================
// ADMIN PANEL ROUTES (Management Operations)
// ==========================================

// 4. UPLOAD: Create new movie, series, or anime (🔒 SECURED WITH PASSWORD)
router.post('/add', async (req, res) => {
  // 🔒 1. Extract password from incoming network headers
  const clientPassword = req.headers['x-admin-password'];
  
  // 🔒 2. Grab the true password hidden inside Heroku's configuration vault
  const secureMasterPassword = process.env.ADMIN_PASSWORD;

  // 🔒 3. Compare them. If they don't match, block the user immediately!
  if (!clientPassword || clientPassword !== secureMasterPassword) {
    return res.status(401).json({ message: "Unauthorized: Invalid Admin Password" });
  }

  // 4. If password matches, proceed with building and saving the movie structure
  const item = new Content({
    title: req.body.title,
    type: req.body.type,
    description: req.body.description,
    coverImageUrl: req.body.coverImageUrl,
    screenshots: req.body.screenshots,
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

// 5. EDIT: Modify specific titles or swap nested links (🔒 SECURED WITH PASSWORD)
router.put('/edit/:id', async (req, res) => {
  // 🔒 1. Extract password from incoming network headers
  const clientPassword = req.headers['x-admin-password'];
  
  // 🔒 2. Grab the true password hidden inside Heroku's configuration vault
  const secureMasterPassword = process.env.ADMIN_PASSWORD;

  // 🔒 3. Compare them. If they don't match, block the modification!
  if (!clientPassword || clientPassword !== secureMasterPassword) {
    return res.status(401).json({ message: "Unauthorized: Invalid Admin Password" });
  }

  try {
    const updatedItem = await Content.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } 
    );
    if (!updatedItem) return res.status(404).json({ message: 'Content not found' });
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 6. DELETE: Wipe out entry completely (🔒 SECURED WITH PASSWORD)
router.delete('/delete/:id', async (req, res) => {
  // 🔒 1. Extract password from incoming network headers
  const clientPassword = req.headers['x-admin-password'];
  
  // 🔒 2. Grab the true password hidden inside Heroku's configuration vault
  const secureMasterPassword = process.env.ADMIN_PASSWORD;

  // 🔒 3. Compare them. If they don't match, block the deletion!
  if (!clientPassword || clientPassword !== secureMasterPassword) {
    return res.status(401).json({ message: "Unauthorized: Invalid Admin Password" });
  }

  try {
    const item = await Content.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Content not found' });
    res.json({ message: 'Content dropped successfully from production directory' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔒 LOGIN ROUTE: Validates the password against Heroku Config Vars
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
