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
  const jsonData = JSON.stringify(payload)
  
  // For now, we'll use a simple API approach
  // In production, you'd use TurboFactory.authenticated with a JWK
  
  try {
    // Try to use Turbo SDK if available
    const { TurboFactory } = await import('@ardrive/turbo-sdk')
    
    // Use unauthenticated turbo for testing (has free tier)
    const turbo = TurboFactory.unauthenticated()
    
    const encoder = new TextEncoder()
    const data = encoder.encode(jsonData)
    
    const uploadResult = await turbo.uploadFile({
      fileStreamFactory: () => {
        // Create a readable stream from the data
        return new ReadableStream({
          start(controller) {
            controller.enqueue(data)
            controller.close()
          }
        })
      },
      fileSizeFactory: () => data.length,
      dataItemOpts: {
        tags: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'App-Name', value: 'BirthdaySongs' },
          { name: 'App-Version', value: '1.0.0' },
          { name: 'Content-Kind', value: payload.contentType },
          { name: 'Encrypted', value: 'true' },
          ...(payload.tokenId !== undefined 
            ? [{ name: 'Token-Id', value: payload.tokenId.toString() }] 
            : []
          ),
        ],
      },
    })
    
    return uploadResult.id
  } catch (error) {
    console.error('Turbo upload failed, using fallback:', error)
    
    // Fallback: Store in localStorage for testing
    // In production, this should always succeed with Turbo
    const fakeId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
    if (typeof window !== 'undefined') {
      localStorage.setItem(`arweave-${fakeId}`, jsonData)
    }
    return fakeId
  }
}

/**
 * Fetch encrypted data from Arweave
 */
export async function fetchFromArweave(transactionId: string): Promise<EncryptedPayload> {
  // Check for local fallback first (testing)
  if (transactionId.startsWith('local-') && typeof window !== 'undefined') {
    const data = localStorage.getItem(`arweave-${transactionId}`)
    if (data) {
      return JSON.parse(data)
    }
  }
  
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
  if (transactionId.startsWith('local-')) {
    return `local://${transactionId}` // For testing
  }
  return `https://arweave.net/${transactionId}`
}

/**
 * Build ar:// URI from transaction ID
 */
export function getArweaveUri(transactionId: string): string {
  if (transactionId.startsWith('local-')) {
    return `local://${transactionId}` // For testing
  }
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
  if (uri.startsWith('local://')) {
    return uri.replace('local://', '')
  }
  return uri
}
