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

// 3. Blueprint for Series Resolutions (Contains Episode links and Batch link)
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

// 5. Main Content Blueprint (Combines everything together)
const ContentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['movie', 'series', 'anime'] },
  description: { type: String, required: true },
  coverImageUrl: { type: String, required: true },
  screenshots: [{ type: String }], 
  
  // Conditional fields depending on the item type
  movieLinks: [MovieDownloadSchema], // Used ONLY if type is 'movie'
  seasons: [SeasonSchema],          // Used ONLY if type is 'series' or 'anime'
  
  createdAt: { type: Date, default: Date.now }
});

// Create a text index so users can search titles quickly
ContentSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Content', ContentSchema);
