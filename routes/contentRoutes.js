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

// 2. Real-time Search Route
router.get('/search', async (req, res) => {
  const { q } = req.query; // e.g., /api/content/search?q=anime
  try {
    const results = await Content.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } });
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
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// ADMIN PANEL ROUTES (Management Operations)
// ==========================================

// 4. UPLOAD: Create new movie, series, or anime
router.post('/add', async (req, res) => {
  const item = new Content({
    title: req.body.title,
    type: req.body.type,
    description: req.body.description,
    coverImageUrl: req.body.coverImageUrl,
    screenshots: req.body.screenshots,
    movieLinks: req.body.movieLinks, // Passed empty if it is a series
    seasons: req.body.seasons        // Passed empty if it is a movie
  });

  try {
    const newItem = await item.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. EDIT: Modify specific titles or swap nested links
router.put('/edit/:id', async (req, res) => {
  try {
    const updatedItem = await Content.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Returns the newly modified object back immediately
    );
    if (!updatedItem) return res.status(404).json({ message: 'Content not found' });
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 6. DELETE: Wipe out entry completely
router.delete('/delete/:id', async (req, res) => {
  try {
    const item = await Content.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Content not found' });
    res.json({ message: 'Content dropped successfully from production directory' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
