/**
 * Development API client for Birthday Songs
 * 
 * Simplified version for local testing without package dependencies
 */

// Local types
interface OrderData {
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

interface UploadResponse {
  success: boolean
  arweaveId: string
  uri?: string
  songKey?: string
  cost?: string
}

interface BalanceResponse {
  credits: number
  creditsFormatted: string
  status: string
}

interface SupplyInfo {
  minted: number
  remaining: number
  limit: number
  soldOut: boolean
}

interface SupplyResponse {
  success: boolean
  supply: {
    birthday: SupplyInfo
    natal: SupplyInfo
    total: {
      minted: number
      remaining: number
      limit: number
    }
  }
}

// Mock encryption for development
async function mockEncrypt(data: any): Promise<string> {
  return btoa(JSON.stringify(data))
}

async function mockDecrypt(encrypted: string): Promise<any> {
  try {
    return JSON.parse(atob(encrypted))
  } catch {
    return encrypted
  }
}

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://birthday-songs-api-prod.dylan-259.workers.dev'

/**
 * Development API client
 */
class DevBirthdaySongsAPI {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  /**
   * Check balance
   */
  async getBalance(): Promise<BalanceResponse> {
    return this.request<BalanceResponse>('/api/balance')
  }

  /**
   * Get supply status
   */
  async getSupply(): Promise<SupplyResponse> {
    return this.request<SupplyResponse>('/api/supply')
  }

  /**
   * Fund with ETH
   */
  async fundWithETH(amount: number): Promise<any> {
    return this.request('/api/fund', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  }

  /**
   * Upload order
   */
  async uploadOrder(orderData: OrderData): Promise<UploadResponse> {
    return this.request<UploadResponse>('/api/orders/upload', {
      method: 'POST',
      body: JSON.stringify({
        orderData: orderData,
        metadata: {
          tokenId: orderData.tokenId,
          type: orderData.type,
        },
      }),
    })
  }

  /**
   * Upload song
   */
  async uploadSong(tokenId: number, songBase64: string): Promise<UploadResponse> {
    return this.request<UploadResponse>('/api/songs/upload', {
      method: 'POST',
      body: JSON.stringify({
        songData: songBase64,
        tokenId: tokenId,
      }),
    })
  }

  /**
   * Fetch order
   */
  async fetchOrder(arweaveId: string): Promise<OrderData> {
    const response = await this.request<{ encryptedData: string }>(`/api/orders/${arweaveId}`)
    return mockDecrypt(response.encryptedData)
  }

  /**
   * Fetch song
   */
  async fetchSong(arweaveId: string, songKey: string): Promise<string> {
    const response = await this.request<{ encryptedData: string }>(`/api/songs/${arweaveId}`)
    return mockDecrypt(response.encryptedData)
  }

  /**
   * List orders
   */
  async listOrders(): Promise<any[]> {
    const response = await this.request<{ orders: any[] }>('/api/orders')
    return response.orders || []
  }
}

// Export singleton instance
export const api = new DevBirthdaySongsAPI()

// Export class
export { DevBirthdaySongsAPI as BirthdaySongsAPI }

// Legacy compatibility
export const CREATOR_ADDRESS = '0xd31c0c3bddacc482aa5fe64d27cddbab72864733'

export async function checkBalance(): Promise<string> {
  try {
    const balance = await api.getBalance()
    return balance.creditsFormatted
  } catch (error) {
    return 'API unavailable'
  }
}

export async function fundWithETH(ethAmount: number): Promise<void> {
  await api.fundWithETH(ethAmount)
}

export async function uploadOrderToPrivateDrive(
  driveId: string,
  drivePassword: string,
  orderData: OrderData
): Promise<string> {
  const result = await api.uploadOrder(orderData)
  return result.arweaveId
}

export async function uploadSongToPrivateDrive(
  driveId: string,
  drivePassword: string,
  tokenId: number,
  songBase64: string
): Promise<{ fileId: string; songKey: string }> {
  const result = await api.uploadSong(tokenId, songBase64)
  return {
    fileId: result.arweaveId,
    songKey: result.songKey || `song-${tokenId}`
  }
}

export async function fetchOrderFromPrivateDrive(
  fileId: string,
  drivePassword: string
): Promise<OrderData> {
  return api.fetchOrder(fileId)
}

export async function fetchSongFromPrivateDrive(
  fileId: string,
  songKey: string
): Promise<string> {
  return api.fetchSong(fileId, songKey)
}

// File utilities
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
  })
}

export function base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

export function downloadSong(base64: string, filename: string = 'birthday-song.mp3'): void {
  const blob = base64ToBlob(base64)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generateSongAccessKey(tokenId: number, songKey: string): string {
  return btoa(JSON.stringify({ tokenId, songKey }))
}

export function parseSongAccessKey(accessKey: string): { tokenId: number; songKey: string } {
  try {
    const decoded = atob(accessKey)
    return JSON.parse(decoded)
  } catch {
    throw new Error('Invalid access key format')
  }
}

export async function getSupply(): Promise<SupplyResponse> {
  return api.getSupply()
}

export type { OrderData, UploadResponse, BalanceResponse, SupplyResponse, SupplyInfo }