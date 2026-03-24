/**
 * Cloudflare Worker for saving Callbreak games
 * Deploy this to your Cloudflare Workers
 */

export default {
  async fetch(request, env) {
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const { gameId, gameState, lastModified } = await request.json();

      if (!gameId || !gameState) {
        return new Response(JSON.stringify({ error: 'Missing gameId or gameState' }), {
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

      // Store in KV with 24 hour expiration
      const gameData = {
        gameId,
        gameState,
        lastModified: lastModified || new Date().toISOString(),
        created: new Date().toISOString()
      };

      await env.CALLBREAK_GAMES.put(gameId, JSON.stringify(gameData), {
        expirationTtl: 86400 // 24 hours
      });

      return new Response(JSON.stringify({ success: true, message: 'Game saved successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error saving game:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};