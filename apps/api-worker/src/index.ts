/**
 * Birthday Songs API Worker
 * 
 * Cloudflare Worker handling all ArDrive/Turbo operations
 * for the decentralized birthday song NFT marketplace
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { TurboFactory } from '@ardrive/turbo-sdk'

// Types
interface Env {
  ARWEAVE_PRIVATE_KEY: string
  TURBO_TOKEN_TYPE: string
  DB: D1Database
  SETTINGS: KVNamespace
}

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
  allowPublication: boolean
  tokenId?: number
}

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors({
  origin: [
    'https://birthdays-with-jose.pages.dev',
    'https://birthday-songs.pages.dev', 
    'https://birthdays-with-jose-dashboard.pages.dev',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'healthy',
    service: 'birthday-songs-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// Get Turbo client
async function getTurboClient(env: Env) {
  const turbo = TurboFactory.authenticated({
    privateKey: env.ARWEAVE_PRIVATE_KEY,
    token: (env.TURBO_TOKEN_TYPE as 'ethereum') || 'ethereum'
  })
  return turbo
}

// Check ArDrive credit balance
app.get('/api/balance', async (c) => {
  try {
    const turbo = await getTurboClient(c.env)
    const balance = await turbo.getBalance()
    
    return c.json({
      credits: balance.winc,
      creditsFormatted: `${balance.winc} winc`,
      status: 'success'
    })
  } catch (error) {
    console.error('Balance check failed:', error)
    return c.json({ error: 'Failed to check balance' }, 500)
  }
})

// Fund wallet with ETH
app.post('/api/fund', async (c) => {
  try {
    const { amount } = await c.req.json()
    const turbo = await getTurboClient(c.env)
    
    const result = await turbo.topUpWithTokens({
      tokenAmount: amount * 1e18 // Convert ETH to wei
    })
    
    return c.json({
      success: true,
      transactionId: result.id,
      winc: result.winc,
      status: result.status
    })
  } catch (error) {
    console.error('Funding failed:', error)
    return c.json({ error: 'Failed to fund wallet' }, 500)
  }
})

// Upload order data to ArDrive (for now, single uploads with unique tags)
app.post('/api/orders/upload', async (c) => {
  try {
    const body = await c.req.json()
    console.log('Order upload request:', JSON.stringify(body, null, 2))
    
    const { orderData, metadata } = body
    
    if (!orderData) {
      return c.json({ error: 'Missing orderData in request body' }, 400)
    }
    
    if (!metadata?.tokenId) {
      return c.json({ error: 'Missing tokenId in metadata' }, 400)
    }
    
    const turbo = await getTurboClient(c.env)
    
    const tokenId = metadata.tokenId
    
    // Upload order data with unique token-based security
    const orderDataStr = JSON.stringify(orderData)
    const orderUploadResult = await turbo.uploadFile({
      fileStreamFactory: () => {
        const encoder = new TextEncoder()
        const data = encoder.encode(orderDataStr)
        return new ReadableStream({
          start(controller) {
            controller.enqueue(data)
            controller.close()
          }
        })
      },
      fileSizeFactory: () => new TextEncoder().encode(orderDataStr).length,
      dataItemOpts: {
        tags: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'App-Name', value: 'BirthdaySongs' },
          { name: 'App-Version', value: '1.0.0' },
          { name: 'Content-Kind', value: 'order-data' },
          { name: 'Token-Id', value: tokenId.toString() },
          { name: 'Access-Level', value: 'private' },
        ],
      },
    })
    
    // Store metadata in D1 database
    await c.env.DB.prepare(`
      INSERT INTO orders (id, token_id, arweave_id, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      tokenId,
      orderUploadResult.id,
      'pending',
      new Date().toISOString()
    ).run()
    
    return c.json({
      success: true,
      arweaveId: orderUploadResult.id,
      uri: `ardrive://${orderUploadResult.id}`,
      tokenId: tokenId,
      cost: orderUploadResult.winc || '0'
    })
    
  } catch (error) {
    console.error('Order upload failed:', error)
    return c.json({ 
      error: 'Failed to upload order',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Upload song to ArDrive (linked to specific order)
app.post('/api/songs/upload', async (c) => {
  try {
    const body = await c.req.json()
    console.log('Song upload request:', JSON.stringify({ tokenId: body.tokenId, dataLength: body.songData?.length }, null, 2))
    
    const { songData, tokenId } = body
    
    if (!songData) {
      return c.json({ error: 'Missing songData in request body' }, 400)
    }
    
    if (!tokenId) {
      return c.json({ error: 'Missing tokenId in request body' }, 400)
    }
    
    const turbo = await getTurboClient(c.env)
    
    // Upload song file to ArDrive
    const uploadResult = await turbo.uploadFile({
      fileStreamFactory: () => {
        const encoder = new TextEncoder()
        const data = encoder.encode(songData) // Base64 or binary data
        return new ReadableStream({
          start(controller) {
            controller.enqueue(data)
            controller.close()
          }
        })
      },
      fileSizeFactory: () => new TextEncoder().encode(songData).length,
      dataItemOpts: {
        tags: [
          { name: 'Content-Type', value: 'audio/mpeg' },
          { name: 'App-Name', value: 'BirthdaySongs' },
          { name: 'App-Version', value: '1.0.0' },
          { name: 'Content-Kind', value: 'song-file' },
          { name: 'Token-Id', value: tokenId.toString() },
          { name: 'Access-Level', value: 'private' },
        ],
      },
    })
    
    // Update order status in database
    await c.env.DB.prepare(`
      UPDATE orders 
      SET song_arweave_id = ?, status = 'fulfilled', fulfilled_at = ?
      WHERE token_id = ?
    `).bind(
      uploadResult.id,
      new Date().toISOString(),
      tokenId
    ).run()
    
    return c.json({
      success: true,
      arweaveId: uploadResult.id,
      uri: `ardrive://${uploadResult.id}`,
      cost: uploadResult.winc || '0'
    })
    
  } catch (error) {
    console.error('Song upload failed:', error)
    return c.json({ 
      error: 'Failed to upload song',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Get order data from ArDrive
app.get('/api/orders/:arweaveId', async (c) => {
  try {
    const arweaveId = c.req.param('arweaveId')
    
    // Fetch encrypted data from ArDrive
    const response = await fetch(`https://arweave.net/${arweaveId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch from ArDrive: ${response.statusText}`)
    }
    
    const encryptedData = await response.text()
    
    return c.json({
      success: true,
      encryptedData,
      arweaveId
    })
    
  } catch (error) {
    console.error('Order fetch failed:', error)
    return c.json({ error: 'Failed to fetch order' }, 500)
  }
})

// Get song data from ArDrive  
app.get('/api/songs/:arweaveId', async (c) => {
  try {
    const arweaveId = c.req.param('arweaveId')
    
    // Fetch encrypted song from ArDrive
    const response = await fetch(`https://arweave.net/${arweaveId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch from ArDrive: ${response.statusText}`)
    }
    
    const encryptedData = await response.text()
    
    return c.json({
      success: true,
      encryptedData,
      arweaveId
    })
    
  } catch (error) {
    console.error('Song fetch failed:', error)
    return c.json({ error: 'Failed to fetch song' }, 500)
  }
})

// List orders for dashboard
app.get('/api/orders', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM orders ORDER BY created_at DESC
    `).all()
    
    return c.json({
      success: true,
      orders: results
    })
    
  } catch (error) {
    console.error('Orders list failed:', error)
    return c.json({ error: 'Failed to list orders' }, 500)
  }
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app