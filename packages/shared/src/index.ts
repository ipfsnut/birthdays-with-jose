/**
 * Shared types and utilities for Birthday Songs
 */

// Order data structure
export interface OrderData {
  type: 'birthday' | 'natal'
  recipientName: string
  birthDate?: string
  birthTime?: string
  birthLocation?: string
  relationship?: string
  interests?: string
  sunSign?: string
  risingSign?: string
  moonSign?: string
  musicalStyle?: string
  message?: string
  orderedBy: string
  orderedAt: string
  tokenId?: number
}

// Order status in database
export interface Order {
  id: string
  token_id: number
  arweave_id: string
  song_arweave_id?: string
  drive_id: string
  song_key?: string
  status: 'pending' | 'fulfilled' | 'downloaded'
  created_at: string
  fulfilled_at?: string
  downloaded_at?: string
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface UploadResponse {
  success: boolean
  arweaveId: string
  uri: string
  cost?: string
  songKey?: string
}

export interface BalanceResponse {
  credits: string
  creditsFormatted: string
  status: string
}

// Song tiers
export enum SongType {
  BIRTHDAY = 0,
  NATAL = 1
}

export const PRICES = {
  [SongType.BIRTHDAY]: 25,   // $25 USDC
  [SongType.NATAL]: 250      // $250 USDC
} as const

// Limited Edition Supply Caps
export const SUPPLY_LIMITS = {
  [SongType.BIRTHDAY]: 25,  // Birthday Song - Venezuelan or English
  [SongType.NATAL]: 25,     // Natal Chart Song
} as const

export const TOTAL_SUPPLY = SUPPLY_LIMITS[SongType.BIRTHDAY] + SUPPLY_LIMITS[SongType.NATAL] // 50 total

// Contract addresses (Base mainnet)
export const CONTRACT_ADDRESSES = {
  BIRTHDAY_SONGS: '0xf1bbdbadc2373bff02a0f2de8a4e449204cb2052', // Deployed contract
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  PLATFORM_WALLET: '0xd31c0c3bddacc482aa5fe64d27cddbab72864733',
} as const

// Configuration
export const CONFIG = {
  DRIVE_ID: 'birthday-songs-drive',
  DRIVE_PASSWORD: 'jose-birthday-songs-2025',
  PLATFORM_FEE: '0.0001', // ETH
  CHAIN_ID: 8453, // Base mainnet
} as const

// Utility functions
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function generateOrderId(tokenId: number): string {
  return `order-${tokenId}-${Date.now()}`
}

export function generateSongKey(tokenId: number): string {
  return `song-${tokenId}-${Date.now()}`
}

// API endpoints
export const API_ENDPOINTS = {
  BALANCE: '/api/balance',
  FUND: '/api/fund',
  UPLOAD_ORDER: '/api/orders/upload',
  UPLOAD_SONG: '/api/songs/upload',
  GET_ORDER: '/api/orders',
  GET_SONG: '/api/songs',
  LIST_ORDERS: '/api/orders'
} as const

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  INSUFFICIENT_BALANCE: 'Insufficient USDC balance',
  UPLOAD_FAILED: 'Failed to upload file',
  DECRYPT_FAILED: 'Failed to decrypt data',
  INVALID_NFT_HOLDER: 'You do not own this NFT',
  CREATOR_ONLY: 'Only the creator can access this'
} as const