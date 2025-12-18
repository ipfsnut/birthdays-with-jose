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
    const { tokenId, arweaveId, status } = await c.req.json()
    
    if (!tokenId || !arweaveId) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Store metadata in D1 database
    await c.env.DB.prepare(`
      INSERT INTO orders (id, token_id, arweave_id, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      tokenId,
      arweaveId,
      status || 'pending',
      new Date().toISOString()
    ).run()
    
    return c.json({
      success: true,
      message: 'Metadata stored successfully'
    })
    
  } catch (error) {
    console.error('Metadata storage failed:', error)
    return c.json({ 
      error: 'Failed to store metadata',
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