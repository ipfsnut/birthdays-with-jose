# Deployment Guide

## Cloudflare Setup

This monorepo deploys to Cloudflare's edge infrastructure:

- **API Worker**: Cloudflare Workers for serverless backend
- **Customer App**: Cloudflare Pages for customer-facing frontend
- **Jose Dashboard**: Cloudflare Pages for creator dashboard

## Prerequisites

1. **Cloudflare Account** with Workers and Pages enabled
2. **Wrangler CLI** installed globally: `npm install -g wrangler`
3. **Environment Variables** configured in Cloudflare dashboard

## Environment Variables

Configure these secrets in the Cloudflare dashboard:

### API Worker Secrets
- `ARWEAVE_PRIVATE_KEY` - ArDrive wallet private key
- `DRIVE_ID` - ArDrive private drive ID
- `DRIVE_PASSWORD` - Drive encryption password

### Pages Environment Variables
- `NEXT_PUBLIC_API_URL` - API Worker URL (auto-configured)

## Manual Deployment

### 1. Deploy API Worker

```bash
cd apps/api-worker
npm run build
wrangler deploy
```

### 2. Deploy Customer App

```bash
cd apps/customer-app
npm run build
wrangler pages deploy out --project-name=birthday-songs-customer
```

### 3. Deploy Jose Dashboard

```bash
cd apps/jose-dashboard
npm run build
wrangler pages deploy out --project-name=birthday-songs-dashboard
```

## GitHub Actions Deployment

Push to `main` branch triggers automatic deployment via `.github/workflows/deploy.yml`.

Required GitHub secrets:
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers and Pages permissions

## Local Development

```bash
# Start all services
npm run dev

# Individual services
npm run dev:api      # API Worker on :8787
npm run dev:customer # Customer App on :3000
npm run dev:jose     # Jose Dashboard on :3001
```

## Production URLs

After deployment, your apps will be available at:

- **API**: `https://birthday-songs-api.your-subdomain.workers.dev`
- **Customer App**: `https://birthday-songs-customer.pages.dev`
- **Jose Dashboard**: `https://birthday-songs-dashboard.pages.dev`

## Custom Domains

Configure custom domains in Cloudflare dashboard:
- Workers → your-api-worker → Settings → Triggers
- Pages → your-project → Custom domains