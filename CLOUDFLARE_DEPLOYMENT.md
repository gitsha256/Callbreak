# Cloudflare Workers Deployment Guide

This guide explains how to deploy the Callbreak game cloud storage functionality to Cloudflare Workers.

## Prerequisites

1. [Cloudflare Account](https://dash.cloudflare.com/)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
3. Authenticated with Wrangler: `wrangler auth login`

## Step 1: Create KV Namespace

First, create a KV namespace to store game data:

```bash
# Create the KV namespace
wrangler kv:namespace create "CALLBREAK_GAMES"

# Note the namespace ID from the output
# It will look like: { "id": "1234567890abcdef", "title": "CALLBREAK_GAMES" }
```

## Step 2: Update Wrangler Configs

Edit both `wrangler-save.toml` and `wrangler-load.toml` files and replace:
- `your-kv-namespace-id` with the actual namespace ID from Step 1

## Step 3: Deploy Workers

Deploy the save game worker:
```bash
wrangler deploy --config wrangler-save.toml
```

Deploy the load game worker:
```bash
wrangler deploy --config wrangler-load.toml
```

Note the deployed URLs from the output. They will look like:
- Save: `https://callbreak-save-game.your-subdomain.workers.dev`
- Load: `https://callbreak-load-game.your-subdomain.workers.dev`

## Step 4: Update Environment Variables

In your Next.js app, create a `.env.local` file (or update your deployment environment variables):

```env
NEXT_PUBLIC_SAVE_GAME_URL=https://callbreak-save-game.signshailesh.workers.dev
NEXT_PUBLIC_LOAD_GAME_URL=https://callbreak-load-game.signshailesh.workers.dev
```

## Step 5: Deploy Your App

Build and deploy your Next.js app to Cloudflare Pages as usual:

```bash
npm run build
# Upload the 'out' folder to Cloudflare Pages
```

## Features

- **Automatic Saving**: Games are automatically saved to cloud every 2 seconds when changes are made
- **Cross-Device Sync**: Share game IDs to continue scoring from different devices
- **24-Hour Expiration**: Games expire after 24 hours to manage storage
- **Fallback Support**: Falls back to localStorage if cloud save fails
- **Backward Compatibility**: Existing local games are migrated to cloud storage

## Security Notes

- Games expire after 24 hours
- No authentication required (public sharing)
- Consider adding rate limiting for production use
- CORS is enabled for web access

## Troubleshooting

1. **Worker deployment fails**: Ensure you're authenticated with `wrangler auth login`
2. **KV namespace issues**: Verify the namespace ID is correct in wrangler configs
3. **CORS errors**: Check that the worker URLs are correct in your environment variables
4. **Games not saving**: Check browser console for network errors