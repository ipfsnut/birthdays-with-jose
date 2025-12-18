# ArDrive Service

Node.js service for handling ArDrive/Turbo SDK operations that don't work in Cloudflare Workers.

## Deploy to Railway

1. Create new Railway project
2. Connect this directory (`apps/ardrive-service`)
3. Add environment variables:
   - `ARWEAVE_PRIVATE_KEY` - Your Ethereum private key (without 0x prefix)
   - `CLOUDFLARE_WORKER_URL` - Optional, for D1 database updates

## Local Development

```bash
npm install
npm run dev
```

## Endpoints

- `GET /` - Health check
- `GET /api/balance` - Check ArDrive credit balance
- `POST /api/orders/upload` - Upload order data to ArDrive
- `POST /api/songs/upload` - Upload song file to ArDrive