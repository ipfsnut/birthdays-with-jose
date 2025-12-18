/**
 * Arweave upload utilities using ArDrive Turbo SDK
 * 
 * For production: Use authenticated Turbo with JWK wallet
 * For testing: Use unauthenticated Turbo (limited free uploads)
 */

// Encrypted data structure stored on Arweave
export interface EncryptedPayload {
  version: number
  ciphertext: string
  dataToEncryptHash: string
  accessControlConditions: any[]
  chain: string
  contentType: 'order' | 'song'
  tokenId?: number
  timestamp: number
}

/**
 * Upload encrypted data to Arweave via Turbo
 * Returns the Arweave transaction ID (can be accessed at https://arweave.net/{id})
 */
export async function uploadToArweave(payload: EncryptedPayload): Promise<string> {
  // Upload through Railway ArDrive service
  const ardriveUrl = process.env.NEXT_PUBLIC_ARDRIVE_URL || 'https://birthday-songs-ardrive.up.railway.app'
  
  try {
    const response = await fetch(`${ardriveUrl}/api/orders/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderData: payload,
        metadata: {
          tokenId: payload.tokenId || Date.now(),
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.arweaveId
  } catch (error) {
    console.error('Upload to ArDrive failed:', error)
    throw error
  }
}

/**
 * Fetch encrypted data from Arweave
 */
export async function fetchFromArweave(transactionId: string): Promise<EncryptedPayload> {
  // Fetch from Arweave gateway
  const response = await fetch(`https://arweave.net/${transactionId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch from Arweave: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Build Arweave URL from transaction ID
 */
export function getArweaveUrl(transactionId: string): string {
  return `https://arweave.net/${transactionId}`
}

/**
 * Build ar:// URI from transaction ID
 */
export function getArweaveUri(transactionId: string): string {
  return `ar://${transactionId}`
}

/**
 * Parse ar:// URI or Arweave URL to get transaction ID
 */
export function parseArweaveUri(uri: string): string {
  if (uri.startsWith('ar://')) {
    return uri.replace('ar://', '')
  }
  if (uri.startsWith('https://arweave.net/')) {
    return uri.replace('https://arweave.net/', '')
  }
  if (uri.startsWith('ardrive://')) {
    return uri.replace('ardrive://', '')
  }
  return uri
}
