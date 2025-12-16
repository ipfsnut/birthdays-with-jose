import { Abi } from 'viem'

// ============================================
// CONFIGURATION - UPDATE THESE AFTER DEPLOYMENT
// ============================================

// BASE MAINNET - PRODUCTION CONTRACT
export const CONTRACT_ADDRESS = '0xf1BBDBaDc2373BFF02a0f2De8a4E449204cb2052' as `0x${string}`

// Creator wallet (will be Jose after ownership transfer)
export const CREATOR_ADDRESS = '0xD31C0C3BdDAcc482Aa5fE64d27cDDBaB72864733' as `0x${string}`

// Platform wallet (receives $0.50 USDC per order)
export const PLATFORM_ADDRESS = '0x9db1afA33E74111F80fc2A7cc458006F55AC76f4' as `0x${string}`

// Base mainnet USDC
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`

// Chain config - Base mainnet
export const CHAIN_ID = 8453 // Base mainnet

// ============================================

export const CONTRACT_CONFIG = {
  address: CONTRACT_ADDRESS,
  chainId: CHAIN_ID,
}

export const USDC_CONFIG = {
  address: USDC_ADDRESS,
  chainId: CHAIN_ID,
  decimals: 6,
}

export enum SongType {
  BIRTHDAY = 0,
  NATAL = 1,
}

export const PRICES = {
  [SongType.BIRTHDAY]: 25,
  [SongType.NATAL]: 250,
}

// Limited Edition Supply Caps
export const SUPPLY_LIMITS = {
  [SongType.BIRTHDAY]: 25,  // Birthday Song - Venezuelan or English
  [SongType.NATAL]: 25,     // Natal Chart Song
}

export const TOTAL_SUPPLY = SUPPLY_LIMITS[SongType.BIRTHDAY] + SUPPLY_LIMITS[SongType.NATAL] // 50 total

// Platform fee in ETH
export const PLATFORM_FEE = '0.000001'

// Contract ABI
export const BIRTHDAY_SONGS_ABI: Abi = [
  {
    inputs: [
      { name: '_usdc', type: 'address' },
      { name: '_platformWallet', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'orderedBy', type: 'address' },
      { indexed: false, name: 'songType', type: 'uint8' },
      { indexed: false, name: 'orderDataUri', type: 'string' },
      { indexed: false, name: 'pricePaid', type: 'uint256' },
    ],
    name: 'OrderCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'songUri', type: 'string' },
    ],
    name: 'OrderFulfilled',
    type: 'event',
  },
  {
    inputs: [{ name: 'orderDataUri', type: 'string' }],
    name: 'mintBirthdaySong',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderDataUri', type: 'string' }],
    name: 'mintNatalSong',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'songUri', type: 'string' },
    ],
    name: 'fulfillOrder',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getOrder',
    outputs: [
      {
        components: [
          { name: 'songType', type: 'uint8' },
          { name: 'orderDataUri', type: 'string' },
          { name: 'orderedBy', type: 'address' },
          { name: 'orderedAt', type: 'uint256' },
          { name: 'pricePaid', type: 'uint256' },
          { name: 'fulfilled', type: 'bool' },
          { name: 'songUri', type: 'string' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'birthdayPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'natalPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'platformFee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'platformWallet',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalOrders',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_birthdayPrice', type: 'uint256' },
      { name: '_natalPrice', type: 'uint256' },
    ],
    name: 'setPrices',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_platformFee', type: 'uint256' }],
    name: 'setPlatformFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'USDC',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'birthdaysMinted',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'natalsMinted',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BIRTHDAY_SUPPLY_LIMIT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'NATAL_SUPPLY_LIMIT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'TOTAL_SUPPLY_LIMIT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSupplyInfo',
    outputs: [
      { name: 'birthdaysMinted_', type: 'uint256' },
      { name: 'birthdaysRemaining', type: 'uint256' },
      { name: 'birthdayLimit', type: 'uint256' },
      { name: 'birthdaysSoldOut', type: 'bool' },
      { name: 'natalsMinted_', type: 'uint256' },
      { name: 'natalsRemaining', type: 'uint256' },
      { name: 'natalLimit', type: 'uint256' },
      { name: 'natalsSoldOut', type: 'bool' },
      { name: 'totalMinted', type: 'uint256' },
      { name: 'totalRemaining', type: 'uint256' },
      { name: 'totalLimit', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// ERC20 ABI for USDC approve/allowance
export const ERC20_ABI: Abi = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
