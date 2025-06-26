require('dotenv').config();
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Vercel serverless handler
module.exports = async (req, res) => {
  // Apply rate limiting
  const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX || 100,
    handler: (_, response) => 
      response.status(429).json({ error: 'Too many requests' })
  });
  
  await new Promise(resolve => 
    limiter(req, res, resolve)
  );

  // Twitter API setup
  const TWITTER_API_URL = 'https://api.twitter.com/2';
  const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
  
  if (!BEARER_TOKEN) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const twitterApi = axios.create({
    baseURL: TWITTER_API_URL,
    headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
  });

  try {
    const username = req.query.username; // From Vercel route
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Fetch user data
    const userResponse = await twitterApi.get(`/users/by/username/${username}`, {
      params: { 'user.fields': 'profile_image_url' }
    });
    
    const user = userResponse.data.data;
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch tweets
    const tweetsResponse = await twitterApi.get(`/users/${user.id}/tweets`, {
      params: {
        max_results: 20,
        'tweet.fields': 'public_metrics,created_at,attachments',
        'expansions': 'author_id,attachments.media_keys',
        'media.fields': 'url'
      }
    });
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(tweetsResponse.data);
    
  } catch (error) {
    // ... (same error handling as original)
  }
};