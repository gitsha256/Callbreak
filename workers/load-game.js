/**
 * Cloudflare Worker for loading Callbreak games
 * Deploy this to your Cloudflare Workers
 */

export default {
  async fetch(request, env) {
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const url = new URL(request.url);
      const gameId = url.searchParams.get('gameId');

      if (!gameId) {
        return new Response(JSON.stringify({ error: 'Missing gameId parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate gameId format (4-digit number)
      if (!/^\d{4}$/.test(gameId)) {
        return new Response(JSON.stringify({ error: 'Invalid gameId format - must be 4 digits' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Retrieve from KV
      const gameDataStr = await env.CALLBREAK_GAMES.get(gameId);

      if (!gameDataStr) {
        return new Response(JSON.stringify({ error: 'Game not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const gameData = JSON.parse(gameDataStr);

      return new Response(JSON.stringify(gameData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error loading game:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};