// API Configuration
// For local development, use: http://localhost:8787
// For production, update with your worker URL after deployment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://street-names-api.pedroqueiroz.workers.dev';

// Set to true to use API-based loading, false to use static GeoJSON files
const USE_API = true;  // API mode enabled - data served from D1
