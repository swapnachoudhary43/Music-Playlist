// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
let accessToken = '';

// Function to get Spotify Access Token
const getAccessToken = async () => {
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    };
    const data = 'grant_type=client_credentials';

    try {
        const response = await axios.post(tokenUrl, data, { headers });
        accessToken = response.data.access_token;
        // Token expires in response.data.expires_in seconds
        setTimeout(getAccessToken, (response.data.expires_in - 60) * 1000); // Refresh token 1 minute before expiry
    } catch (error) {
        console.error('Error fetching access token:', error.response.data);
    }
};

// Initialize access token
getAccessToken();

// Helper function to map mood to Spotify audio features
const getAudioFeatures = (mood) => {
    // This is a simplistic mapping. You can enhance it based on your requirements.
    const moodMap = {
        happy: { min_valence: 0.7, max_valence: 1.0, min_energy: 0.6 },
        sad: { max_valence: 0.4, min_energy: 0.0 },
        energetic: { min_energy: 0.7 },
        calm: { max_energy: 0.4 },
        // Add more moods as needed
    };
    return moodMap[mood] || {};
};

// Endpoint to generate playlist
app.post('/generate-playlist', async (req, res) => {
    const { genre, mood } = req.body;

    if (!accessToken) {
        return res.status(500).json({ error: 'Spotify access token not available' });
    }

    try {
        // Search for tracks based on genre
        const searchUrl = 'https://api.spotify.com/v1/search';
        const searchParams = new URLSearchParams({
            q: `genre:"${genre}"`,
            type: 'track',
            limit: 50, // Maximum allowed by Spotify
        });

        const searchResponse = await axios.get(`${searchUrl}?${searchParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        let tracks = searchResponse.data.tracks.items;

        // Get track IDs
        const trackIds = tracks.map(track => track.id).join(',');

        // Get audio features for tracks
        const featuresUrl = `https://api.spotify.com/v1/audio-features`;
        const featuresResponse = await axios.get(featuresUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            params: {
                ids: trackIds,
            },
        });

        const audioFeatures = featuresResponse.data.audio_features;

        // Filter tracks based on mood
        const moodCriteria = getAudioFeatures(mood);
        const filteredTracks = tracks.filter((track, index) => {
            const features = audioFeatures[index];
            if (!features) return false;

            // Check valence
            if (moodCriteria.min_valence && features.valence < moodCriteria.min_valence) return false;
            if (moodCriteria.max_valence && features.valence > moodCriteria.max_valence) return false;

            // Check energy
            if (moodCriteria.min_energy && features.energy < moodCriteria.min_energy) return false;
            if (moodCriteria.max_energy && features.energy > moodCriteria.max_energy) return false;

            return true;
        });

        // If not enough tracks, return whatever is available
        const playlist = filteredTracks.slice(0, 20).map(track => ({
            title: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            album: track.album.name,
            url: track.external_urls.spotify,
            cover: track.album.images[0]?.url || '',
        }));

        res.json({ playlist });
    } catch (error) {
        console.error('Error generating playlist:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate playlist' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
