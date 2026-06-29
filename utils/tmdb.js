// Function to make authenticated requests to TMDb API v3
async function fetchFromTMDb(endpoint, queryParams = "") {
  const apiKey = process.env.TMDB_KEY;
  if (!apiKey) {
    console.error("Missing TMDB_KEY variable inside Heroku configurations!");
    return null;
  }
  
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${apiKey}&language=en-US${queryParams}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TMDb response error status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`TMDb API Failure on ${endpoint}:`, error);
    return null;
  }
}

module.exports = { fetchFromTMDb };
