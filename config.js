// API Configuration
// For local development, use: http://localhost:8787
// For production, update with your worker URL after deployment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://street-names-api.YOUR_SUBDOMAIN.workers.dev';  // TODO: Update after deploying worker

// Set to true to use API-based loading, false to use static GeoJSON files
const USE_API = false;  // TODO: Set to true after backend is deployed
