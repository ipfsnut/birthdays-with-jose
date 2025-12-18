/**
 * Birthday Songs API Worker
 * 
 * Cloudflare Worker handling all ArDrive/Turbo operations
 * for the decentralized birthday song NFT marketplace
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Types
interface Env {
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

// Note: ArDrive operations moved to Railway service
// These endpoints are kept for backwards compatibility but redirect to Railway

// Store order metadata in D1 database (called by Railway ArDrive service)
app.post('/api/orders/metadata', async (c) => {
  try {
    const { tokenId, arweaveId, status, orderData } = await c.req.json()
    
    if (!tokenId || !arweaveId) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    console.log('🔍 Storing order metadata:', { tokenId, arweaveId, orderData })
    
    // Store full metadata in D1 database
    await c.env.DB.prepare(`
      INSERT INTO orders (
        id, token_id, arweave_id, status, created_at,
        recipient_name, birth_date, relationship, interests, message,
        allow_publication, birth_time, birth_location, sun_sign, moon_sign,
        rising_sign, musical_style, order_type, ordered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      tokenId,
      arweaveId,
      status || 'pending',
      new Date().toISOString(),
      orderData?.recipientName || null,
      orderData?.birthDate || null,
      orderData?.relationship || null,
      orderData?.interests || null,
      orderData?.message || null,
      orderData?.allowPublication ? 1 : 0,
      orderData?.birthTime || null,
      orderData?.birthLocation || null,
      orderData?.sunSign || null,
      orderData?.moonSign || null,
      orderData?.risingSign || null,
      orderData?.musicalStyle || null,
      orderData?.type || null,
      orderData?.orderedBy || null
    ).run()
    
    return c.json({
      success: true,
      message: 'Metadata stored successfully'
    })
    
  } catch (error) {
    console.error('❌ Metadata storage failed:', error)
    return c.json({ 
      error: 'Failed to store metadata',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Upload order data (called by frontend)
app.post('/api/orders/upload', async (c) => {
  try {
    console.log('🔍 Upload request received')
    const orderData = await c.req.json()
    console.log('🔍 Order data received:', JSON.stringify(orderData, null, 2))
    
    // Upload to Railway ArDrive service
    const ardriveResponse = await fetch('https://birthdays-with-jose-production.up.railway.app/api/orders/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderData })
    })
    
    if (!ardriveResponse.ok) {
      console.error('❌ Railway service error:', ardriveResponse.status, await ardriveResponse.text())
      throw new Error(`Railway service error: ${ardriveResponse.status}`)
    }
    
    const result = await ardriveResponse.json()
    console.log('🔍 Railway response:', result)
    
    return c.json(result)
    
  } catch (error) {
    console.error('❌ Upload failed:', error)
    return c.json({ 
      error: 'Failed to upload order',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Upload song data (called by creator dashboard)
app.post('/api/songs/upload', async (c) => {
  try {
    console.log('🔍 Song upload request received')
    const { tokenId, songBase64 } = await c.req.json()
    console.log('🔍 Song data for token:', tokenId)
    
    if (!tokenId || !songBase64) {
      return c.json({ error: 'Missing tokenId or songBase64' }, 400)
    }
    
    // Upload to Railway ArDrive service
    const ardriveResponse = await fetch('https://birthdays-with-jose-production.up.railway.app/api/songs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId: tokenId,
        songData: songBase64
      })
    })
    
    if (!ardriveResponse.ok) {
      console.error('❌ Railway song upload error:', ardriveResponse.status, await ardriveResponse.text())
      throw new Error(`Railway service error: ${ardriveResponse.status}`)
    }
    
    const result = await ardriveResponse.json()
    console.log('🔍 Railway song upload response:', result)
    
    return c.json(result)
    
  } catch (error) {
    console.error('❌ Song upload failed:', error)
    return c.json({ 
      error: 'Failed to upload song',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Update order as fulfilled (called by Railway ArDrive service after song upload)
app.post('/api/orders/fulfill', async (c) => {
  try {
    const { tokenId, songArweaveId } = await c.req.json()
    
    if (!tokenId || !songArweaveId) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Update order status in database
    await c.env.DB.prepare(`
      UPDATE orders 
      SET song_arweave_id = ?, status = 'fulfilled', fulfilled_at = ?
      WHERE token_id = ?
    `).bind(
      songArweaveId,
      new Date().toISOString(),
      tokenId
    ).run()
    
    return c.json({
      success: true,
      message: 'Order marked as fulfilled'
    })
    
  } catch (error) {
    console.error('Fulfillment update failed:', error)
    return c.json({ 
      error: 'Failed to update order status',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Get order data from Railway service
app.get('/api/orders/:arweaveId', async (c) => {
  try {
    const arweaveId = c.req.param('arweaveId')
    console.log('🔍 Fetching order from Railway:', arweaveId)
    
    const railwayResponse = await fetch(`https://birthdays-with-jose-production.up.railway.app/api/orders/${arweaveId}`)
    
    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text().catch(() => 'No response text')
      console.error('❌ Railway service failed:', railwayResponse.status, errorText)
      throw new Error(`Railway service error: ${railwayResponse.status} - ${errorText}`)
    }
    
    const railwayData = await railwayResponse.json()
    console.log('📦 Railway response success:', railwayData)
    return c.json(railwayData)
    
  } catch (error) {
    console.error('❌ Order fetch failed:', error)
    return c.json({ 
      error: 'Failed to fetch order from Railway service', 
      details: error instanceof Error ? error.message : 'Unknown error',
      arweaveId: c.req.param('arweaveId')
    }, 500)
  }
})

// Get song data from ArDrive with NFT ownership verification
app.get('/api/songs/:tokenId/:userAddress', async (c) => {
  try {
    const tokenId = c.req.param('tokenId')
    const userAddress = c.req.param('userAddress')
    
    console.log('🔍 Song download request:', { tokenId, userAddress })
    
    // TODO: Verify NFT ownership by calling the contract
    // For now, we'll trust the frontend verification
    
    // Get order from database to find song ArDrive ID
    const { results } = await c.env.DB.prepare(`
      SELECT song_arweave_id, status FROM orders WHERE token_id = ?
    `).bind(parseInt(tokenId)).all()
    
    if (!results.length) {
      return c.json({ error: 'Order not found' }, 404)
    }
    
    const order = results[0] as any
    if (!order.song_arweave_id) {
      return c.json({ error: 'Song not yet uploaded' }, 404)
    }
    
    if (order.status !== 'fulfilled') {
      return c.json({ error: 'Song not yet ready' }, 404)
    }
    
    // Fetch song from ArDrive
    const response = await fetch(`https://arweave.net/${order.song_arweave_id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch from ArDrive: ${response.statusText}`)
    }
    
    const songData = await response.text()
    
    return c.json({
      success: true,
      songData: songData,
      arweaveId: order.song_arweave_id,
      tokenId: parseInt(tokenId)
    })
    
  } catch (error) {
    console.error('❌ Song fetch failed:', error)
    return c.json({ error: 'Failed to fetch song' }, 500)
  }
})

// Legacy endpoint for backwards compatibility
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
    
    // Map database fields to dashboard expected format
    const mappedOrders = results.map(order => ({
      ...order,
      orderDataUri: `ardrive://${order.arweave_id}`,
      tokenId: order.token_id,
      // Map snake_case to camelCase for frontend compatibility
      recipientName: order.recipient_name,
      birthDate: order.birth_date,
      allowPublication: Boolean(order.allow_publication),
      birthTime: order.birth_time,
      birthLocation: order.birth_location,
      sunSign: order.sun_sign,
      moonSign: order.moon_sign,
      risingSign: order.rising_sign,
      musicalStyle: order.musical_style,
      orderType: order.order_type,
      orderedBy: order.ordered_by
    }))
    
    return c.json({
      success: true,
      orders: mappedOrders
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