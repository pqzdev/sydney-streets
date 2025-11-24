/**
 * Cloudflare Worker API for Street Names visualization
 * Provides on-demand data fetching with spatial indexing
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route API requests
      if (url.pathname.startsWith('/api/streets')) {
        return handleStreetsRequest(url, env, corsHeaders);
      }

      if (url.pathname.startsWith('/api/counts')) {
        return handleCountsRequest(url, env, corsHeaders);
      }

      if (url.pathname.startsWith('/api/search')) {
        return handleSearchRequest(url, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * GET /api/streets?city=sydney&bounds=lat1,lng1,lat2,lng2
 * GET /api/streets?city=sydney&name=Regent+Street
 */
async function handleStreetsRequest(url, env, corsHeaders) {
  const city = url.searchParams.get('city');
  const bounds = url.searchParams.get('bounds');
  const name = url.searchParams.get('name');

  if (!city) {
    return new Response(JSON.stringify({ error: 'city parameter required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let query, params;

  if (name) {
    // Fetch specific street by name
    query = `
      SELECT name, instance_id, geometry
      FROM street_segments
      WHERE city = ? AND name = ?
    `;
    params = [city, name];
  } else if (bounds) {
    // Fetch streets within viewport bounds
    const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);

    query = `
      SELECT name, instance_id, geometry
      FROM street_segments
      WHERE city = ?
        AND max_lat >= ? AND min_lat <= ?
        AND max_lng >= ? AND min_lng <= ?
      LIMIT 10000
    `;
    params = [city, minLat, maxLat, minLng, maxLng];
  } else {
    return new Response(JSON.stringify({ error: 'bounds or name parameter required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { results } = await env.DB.prepare(query).bind(...params).all();

  // Group segments by (name, instance_id) into MultiLineString features
  const instances = {};

  for (const row of results) {
    const key = `${row.name}_${row.instance_id}`;

    if (!instances[key]) {
      instances[key] = {
        type: 'Feature',
        properties: {
          name: row.name,
          id: row.instance_id
        },
        geometry: {
          type: 'MultiLineString',
          coordinates: []
        }
      };
    }

    // Parse geometry (stored as GeoJSON LineString)
    const geom = JSON.parse(row.geometry);
    instances[key].geometry.coordinates.push(geom.coordinates);
  }

  const features = Object.values(instances);

  return new Response(JSON.stringify({
    type: 'FeatureCollection',
    features
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * GET /api/counts?city=sydney
 */
async function handleCountsRequest(url, env, corsHeaders) {
  const city = url.searchParams.get('city');

  if (!city) {
    return new Response(JSON.stringify({ error: 'city parameter required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get pre-computed street counts
  const { results } = await env.DB.prepare(`
    SELECT name, COUNT(DISTINCT instance_id) as count
    FROM street_segments
    WHERE city = ?
    GROUP BY name
    ORDER BY count DESC, name ASC
  `).bind(city).all();

  const counts = {};
  for (const row of results) {
    counts[row.name] = row.count;
  }

  return new Response(JSON.stringify({
    method: 'Grid 200m + Highway-Aware',
    total_streets: results.length,
    counts
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * GET /api/search?city=sydney&query=regent
 */
async function handleSearchRequest(url, env, corsHeaders) {
  const city = url.searchParams.get('city');
  const query = url.searchParams.get('query');

  if (!city || !query) {
    return new Response(JSON.stringify({ error: 'city and query parameters required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { results } = await env.DB.prepare(`
    SELECT DISTINCT name, COUNT(DISTINCT instance_id) as count
    FROM street_segments
    WHERE city = ? AND name LIKE ?
    GROUP BY name
    ORDER BY count DESC, name ASC
    LIMIT 50
  `).bind(city, `%${query}%`).all();

  return new Response(JSON.stringify({
    results: results.map(r => ({ name: r.name, count: r.count }))
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
