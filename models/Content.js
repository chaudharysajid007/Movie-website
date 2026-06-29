const mongoose = require('mongoose');

// 1. Blueprint for Movie Download Links (Flat Structure)
const MovieDownloadSchema = new mongoose.Schema({
  resolution: { type: String, required: true, enum: ['480p', '720p', '1080p'] },
  downloadUrl: { type: String, required: true }
});

// 2. Blueprint for Series Episodes
const EpisodeSchema = new mongoose.Schema({
  episodeNumber: { type: Number, required: true },
  downloadUrl: { type: String, required: true }
});

// 3. Blueprint for Series Resolutions
const ResolutionSchema = new mongoose.Schema({
  resolution: { type: String, required: true, enum: ['480p', '720p', '1080p'] },
  batchLink: { type: String, default: null }, 
  episodes: [EpisodeSchema] 
});

// 4. Blueprint for Series Seasons
const SeasonSchema = new mongoose.Schema({
  seasonNumber: { type: Number, required: true },
  resolutions: [ResolutionSchema] 
});

// 5. Main Smart Content Blueprint
const ContentSchema = new mongoose.Schema({
  // 🌟 THE ANCHOR: This links your downloads directly to TMDb's library
  tmdbId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  // Keeps track of the format for easier system filtering
  type: { 
    type: String, 
    required: true, 
    enum: ['movie', 'series', 'anime'] 
  },
  
  // Your original link structures are perfectly preserved!
  movieLinks: [MovieDownloadSchema], // Used ONLY if type is 'movie'
  seasons: [SeasonSchema],          // Used ONLY if type is 'series' or 'anime'
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Content', ContentSchema);
