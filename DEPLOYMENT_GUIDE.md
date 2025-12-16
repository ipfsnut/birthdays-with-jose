# 🚀 Birthday Songs Deployment Guide

## Phase 1: Test Deployment on Base Mainnet ($0.01 prices)

### 1. Set up environment
```bash
cd apps/jose-dashboard
cp .env.example .env
# Add your PRIVATE_KEY to .env (the deployer wallet with ETH for gas)
```

### 2. Deploy TEST contract
```bash
forge script script/DeployMainnet.s.sol --rpc-url https://mainnet.base.org --broadcast --verify
```

### 3. Update frontend configurations
Update contract addresses in:
- `apps/customer-app/src/lib/contract.ts`
- `apps/jose-dashboard/src/lib/contract.ts`

```typescript
export const CONTRACT_ADDRESS = '0x...' // New contract address from deployment
export const CHAIN_ID = 8453 // Base mainnet
```

### 4. Set up ArDrive
1. Create an Arweave wallet at https://arweave.app
2. Fund it with AR tokens (get from exchanges or https://www.arweave.org/get-involved/community)
3. Create a private drive using ArDrive app
4. Note down:
   - Wallet private key
   - Drive ID
   - Drive password

### 5. Configure API Worker
Create `apps/api-worker/wrangler.toml`:
```toml
name = "birthday-songs-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
TURBO_TOKEN_TYPE = "ethereum"

[secrets]
# Add via: wrangler secret put ARWEAVE_PRIVATE_KEY
ARWEAVE_PRIVATE_KEY = ""
```

Deploy to Cloudflare:
```bash
cd apps/api-worker
wrangler secret put ARWEAVE_PRIVATE_KEY
wrangler publish
```

### 6. Deploy Frontends

Customer app:
```bash
cd apps/customer-app
npm run build
# Deploy to Vercel/Netlify/Pages
```

Jose Dashboard:
```bash
cd apps/jose-dashboard  
npm run build
# Deploy to separate domain
```

### 7. Test Complete Flow
1. Buy $0.01 of USDC on Base
2. Place a test order through customer app
3. Check order appears in Jose's dashboard
4. Upload a test song
5. Verify download works

## Phase 2: Production Deployment ($25/$250 prices)

### 1. Deploy PRODUCTION contract
```bash
cd apps/jose-dashboard
forge script script/DeployMainnetProduction.s.sol --rpc-url https://mainnet.base.org --broadcast --verify
```

### 2. Update all contract addresses
Update the new production contract address in both frontends

### 3. Redeploy frontends with production config

### 4. Final checks
- Verify USDC prices show correctly ($25/$250)
- Test wallet connection
- Confirm ArDrive encryption works
- Check dashboard withdrawal functionality

## Environment Variables Summary

### API Worker (.env / Cloudflare secrets)
```
ARWEAVE_PRIVATE_KEY=<arweave-wallet-key>
TURBO_TOKEN_TYPE=ethereum
```

### Customer App (.env.local)
```
NEXT_PUBLIC_API_URL=https://birthday-songs-api.workers.dev
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract>
NEXT_PUBLIC_CHAIN_ID=8453
```

### Jose Dashboard (.env.local)  
```
NEXT_PUBLIC_API_URL=https://birthday-songs-api.workers.dev
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract>
NEXT_PUBLIC_CREATOR_ADDRESS=0xd31c0c3bddacc482aa5fe64d27cddbab72864733
NEXT_PUBLIC_CHAIN_ID=8453
```

## Important Addresses

- **Base USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Creator/Platform**: `0xd31c0c3bddacc482aa5fe64d27cddbab72864733`
- **Chain ID**: 8453 (Base mainnet)

## Troubleshooting

1. **"Insufficient USDC balance"**: Buy USDC on Base via bridge or DEX
2. **"ArDrive upload failed"**: Check AR token balance and Turbo credits
3. **"Contract not verified"**: Add `--verify` flag and ensure Etherscan API key is set
4. **"Gas price too high"**: Wait for lower network activity or increase gas limit

## Security Checklist

- [ ] Private keys stored securely (never in code)
- [ ] ArDrive wallet funded with sufficient AR
- [ ] Contract verified on Basescan
- [ ] CORS configured correctly in API worker
- [ ] HTTPS enabled on all frontends
- [ ] Environment variables properly set