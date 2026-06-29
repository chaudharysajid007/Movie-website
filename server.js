const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import our custom API routes
const contentRoutes = require('./routes/contentRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas Cloud
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('🚀 SUCCESS: Connected to MongoDB Cloud Database!'))
  .catch(err => console.error('❌ DATABASE CONNECTION ERROR:', err));

// Link our custom routes to a clean endpoint url
app.use('/api/content', contentRoutes);

// Base root test route
app.get('/', (req, res) => {
  res.send('Movie Website API Engine is running perfectly online!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
