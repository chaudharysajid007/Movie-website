const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const contentRoutes = require('./routes/contentRoutes');

const app = express();

// Middleware 
app.use(express.json());
app.use(cors());

// Secure Extraction
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error("❌ CRITICAL ERROR: MONGODB_URI is undefined inside production settings.");
}

// Modernized Cloud Connection Engine (Stripped of obsolete parameters)
mongoose.connect(mongoURI)
  .then(() => console.log('🚀 SUCCESS: Connected to MongoDB Cloud Database!'))
  .catch(err => {
    console.error('🔥 CRITICAL MONGO CONNECTION FAILURE:');
    console.error(err.message);
    console.error(err.stack);
  });

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
