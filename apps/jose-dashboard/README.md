# 🎂 Birthday Songs

A fully decentralized Farcaster miniapp for ordering custom birthday songs. Built with Lit Protocol for encryption and Arweave for permanent storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DECENTRALIZED ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CUSTOMER ORDER FLOW:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Fill form (name, birth info, preferences)                       │   │
│  │  2. Encrypt with Lit → only CREATOR can decrypt                     │   │
│  │  3. Upload encrypted blob to Arweave (permanent)                    │   │
│  │  4. Pay USDC → mint NFT with orderDataUri                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  CREATOR FULFILLMENT FLOW:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Connect wallet (verified as creator)                            │   │
│  │  2. Decrypt order data → see customer's request                     │   │
│  │  3. Create the song                                                 │   │
│  │  4. Encrypt song with Lit → CREATOR or NFT HOLDER can decrypt       │   │
│  │  5. Upload encrypted song to Arweave                                │   │
│  │  6. Call fulfillOrder(tokenId, songUri) + pay platform fee          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  CUSTOMER DOWNLOAD FLOW:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Connect wallet                                                  │   │
│  │  2. Click "Download" on fulfilled order                             │   │
│  │  3. Lit verifies ownerOf(tokenId) == connected wallet               │   │
│  │  4. Decrypt song client-side                                        │   │
│  │  5. Download MP3 file                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  NFT TRANSFER:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Sell/transfer NFT → new owner can decrypt                        │   │
│  │  • Old owner loses access (ownerOf check fails)                     │   │
│  │  • Creator always retains access                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## What's Stored Where

| Data | Storage | Who Can Access |
|------|---------|----------------|
| Order details (birth info, preferences) | Arweave (encrypted) | Creator only |
| Song file | Arweave (encrypted) | Creator OR NFT holder |
| NFT ownership | Base blockchain | Public |
| USDC payments | Base blockchain | Public |

## Pricing

| Tier | Price | Platform Fee |
|------|-------|--------------|
| 🎂 Birthday Song | $25 USDC | 0.000001 ETH |
| ✨ Natal Chart Song | $250 USDC | 0.000001 ETH |

Platform fee is paid by creator on fulfillment (covers Lit + Arweave costs).

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Blockchain**: Base L2, Solidity, ERC721
- **Payment**: USDC
- **Encryption**: Lit Protocol (Datil network)
- **Storage**: Arweave via Turbo SDK
- **Wallet**: Farcaster miniapp SDK + Wagmi

## Project Structure

```
birthday-songs-miniapp/
├── contracts/
│   └── BirthdaySongs.sol      # ERC721 contract
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main app with tabs
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # Wagmi + React Query
│   │   └── globals.css        # Mobile-first styles
│   ├── components/
│   │   ├── OrderForm.tsx      # Customer order form
│   │   ├── MyOrders.tsx       # Customer's NFTs + download
│   │   └── CreatorDashboard.tsx # Creator admin panel
│   └── lib/
│       ├── contract.ts        # Contract config + ABI
│       ├── lit.ts             # Lit Protocol encryption
│       ├── arweave.ts         # Arweave upload/fetch
│       └── wagmi.ts           # Wagmi config
└── public/
    └── .well-known/
        └── farcaster.json     # Miniapp manifest
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Contract

Using Foundry:

```bash
# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts

# Deploy to Base
forge create contracts/BirthdaySongs.sol:BirthdaySongs \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args \
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
    0xd31c0c3bddacc482aa5fe64d27cddbab72864733

# Constructor args:
# - USDC address on Base
# - Platform wallet (receives ETH fees)
```

### 3. Update Contract Address

After deployment, update in two places:

**src/lib/contract.ts:**
```typescript
export const CONTRACT_ADDRESS = '0xYOUR_DEPLOYED_ADDRESS' as `0x${string}`
```

**src/lib/lit.ts:**
```typescript
export const CONTRACT_ADDRESS = '0xYOUR_DEPLOYED_ADDRESS'
```

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Test in Farcaster

1. Enable Developer Mode in Warpcast settings
2. Add miniapp with your ngrok/localhost URL
3. Test the full flow

## Configuration

### Addresses (src/lib/contract.ts)

```typescript
// For testing (your address)
export const CREATOR_ADDRESS = '0xd31c0c3bddacc482aa5fe64d27cddbab72864733'

// For production (friend's address)
// export const CREATOR_ADDRESS = '0x40dc38373c41E0e459099613a1C3a11830dDe1e3'

// Platform wallet receives ETH fees
export const PLATFORM_ADDRESS = '0xd31c0c3bddacc482aa5fe64d27cddbab72864733'
```

### Lit Network

Currently using `DatilDev` (free testnet). For production:

**src/lib/lit.ts:**
```typescript
litNodeClient = new LitNodeClient({
  litNetwork: LIT_NETWORK.Datil, // Production network
  debug: false,
})
```

You'll need to mint Capacity Credits on Datil for production usage.

## How Encryption Works

### Order Data (Customer → Creator)

```typescript
// Access control: only creator wallet can decrypt
const condition = {
  conditionType: 'evmBasic',
  method: '',
  parameters: [':userAddress'],
  returnValueTest: {
    comparator: '=',
    value: CREATOR_ADDRESS,
  },
}
```

### Song File (Creator → NFT Holder)

```typescript
// Access control: creator OR NFT holder
const condition = {
  operator: 'or',
  conditions: [
    { /* wallet == CREATOR_ADDRESS */ },
    { /* ownerOf(tokenId) == wallet */ },
  ],
}
```

## Flow Details

### Customer Orders

1. Fills form with recipient details
2. `encryptOrderData()` - encrypts with Lit (client-side, free)
3. `uploadToArweave()` - stores encrypted blob
4. Approves USDC spend
5. `mintBirthdaySong()` or `mintNatalSong()` - pays + mints NFT

### Creator Fulfills

1. Sees pending orders in Creator tab
2. Clicks order → `decryptOrderData()` fetches from Arweave, decrypts via Lit
3. Creates song offline
4. Uploads audio file → `encryptSong()` + `uploadToArweave()`
5. `fulfillOrder(tokenId, songUri)` + sends platform fee in ETH

### Customer Downloads

1. Sees "Ready" status on their NFT
2. Clicks Download → `decryptSong()` via Lit
3. Lit verifies `ownerOf(tokenId) == connected wallet`
4. Decrypted audio downloaded as MP3

## Costs

| Action | Who Pays | Cost |
|--------|----------|------|
| Encrypt order | Customer | Free (client-side) |
| Store order on Arweave | Customer | ~$0.001 |
| Decrypt order | Creator | 1 Lit request |
| Encrypt song | Creator | Free (client-side) |
| Store song on Arweave | Creator | ~$0.01-0.05 |
| Decrypt song | Customer | 1 Lit request |
| **Platform fee** | Creator | 0.000001 ETH |

Total platform cost per song: ~$0.02-0.06
Platform fee collected: 0.000001 ETH (~$0.003 at current prices)

For production, increase platform fee to ~0.0001 ETH to ensure profitability.

## Switching to Production

1. **Deploy contract** with friend's address as owner
2. **Update CREATOR_ADDRESS** to friend's wallet
3. **Switch Lit network** from DatilDev to Datil
4. **Mint Capacity Credits** on Lit for production usage
5. **Update Farcaster manifest** with real domain
6. **Deploy to Vercel/Railway**

## License

MIT
