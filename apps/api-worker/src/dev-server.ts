/**
 * Development Server for Birthday Songs API
 * 
 * Local development server that simulates ArDrive/Turbo functionality
 * using in-memory storage for testing
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

// Supply limits
const SUPPLY_LIMITS = {
  birthday: 25,  // Birthday Song - Venezuelan or English ($25)
  natal: 25,     // Natal Chart Song ($250)
}

// In-memory storage simulation
const mockStorage = {
  orders: new Map<string, any>(),
  songs: new Map<string, any>(),
  balance: 1000000, // Mock winc balance
}

// Types
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
const app = new Hono()

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'healthy',
    service: 'birthday-songs-api-dev',
    version: '1.0.0',
    storage: 'localStorage-simulation',
    timestamp: new Date().toISOString()
  })
})

// Helper functions
function getSupplyCount() {
  const orders = Array.from(mockStorage.orders.values())
  
  const birthdayCount = orders.filter(order => 
    order.metadata?.type === 'birthday'
  ).length
  
  const natalCount = orders.filter(order => 
    order.metadata?.type === 'natal'
  ).length

  return {
    birthday: {
      minted: birthdayCount,
      remaining: Math.max(0, SUPPLY_LIMITS.birthday - birthdayCount),
      limit: SUPPLY_LIMITS.birthday,
      soldOut: birthdayCount >= SUPPLY_LIMITS.birthday
    },
    natal: {
      minted: natalCount,
      remaining: Math.max(0, SUPPLY_LIMITS.natal - natalCount),
      limit: SUPPLY_LIMITS.natal,
      soldOut: natalCount >= SUPPLY_LIMITS.natal
    },
    total: {
      minted: birthdayCount + natalCount,
      remaining: Math.max(0, (SUPPLY_LIMITS.birthday + SUPPLY_LIMITS.natal) - (birthdayCount + natalCount)),
      limit: SUPPLY_LIMITS.birthday + SUPPLY_LIMITS.natal
    }
  }
}

function checkSupplyAvailable(type: 'birthday' | 'natal'): boolean {
  const supply = getSupplyCount()
  return !supply[type].soldOut
}

// Check mock balance
app.get('/api/balance', async (c) => {
  return c.json({
    credits: mockStorage.balance,
    creditsFormatted: `${mockStorage.balance} winc`,
    status: 'success'
  })
})

// Get supply status
app.get('/api/supply', async (c) => {
  return c.json({
    success: true,
    supply: getSupplyCount()
  })
})

// Mock fund wallet
app.post('/api/fund', async (c) => {
  try {
    const { amount } = await c.req.json()
    const additionalCredits = amount * 100000 // Mock conversion
    mockStorage.balance += additionalCredits
    
    return c.json({
      success: true,
      transactionId: `mock-tx-${Date.now()}`,
      winc: additionalCredits,
      status: 'confirmed',
      newBalance: mockStorage.balance
    })
  } catch (error) {
    console.error('Mock funding failed:', error)
    return c.json({ error: 'Failed to fund wallet' }, 500)
  }
})

// Upload encrypted order data (mock)
app.post('/api/orders/upload', async (c) => {
  try {
    const { encryptedData, driveId, metadata } = await c.req.json()
    
    // Check supply limits
    if (!checkSupplyAvailable(metadata.type)) {
      const supply = getSupplyCount()
      return c.json({ 
        error: `${metadata.type === 'birthday' ? 'Birthday Songs' : 'Natal Chart Songs'} are sold out! (${supply[metadata.type].minted}/${supply[metadata.type].limit})` 
      }, 400)
    }
    
    // Generate mock ArDrive ID
    const arweaveId = `mock-order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Store in mock storage
    mockStorage.orders.set(arweaveId, {
      id: arweaveId,
      encryptedData,
      driveId,
      metadata,
      tokenId: metadata.tokenId,
      status: 'pending',
      createdAt: new Date().toISOString()
    })
    
    const supply = getSupplyCount()
    console.log(`📝 Mock order uploaded: ${arweaveId} | ${metadata.type} (${supply[metadata.type].minted}/${supply[metadata.type].limit})`)
    
    return c.json({
      success: true,
      arweaveId,
      uri: `ardrive://${arweaveId}`,
      cost: '100', // Mock cost
      supply: supply[metadata.type]
    })
    
  } catch (error) {
    console.error('Mock order upload failed:', error)
    return c.json({ error: 'Failed to upload order' }, 500)
  }
})

// Upload encrypted song (mock)
app.post('/api/songs/upload', async (c) => {
  try {
    const { encryptedData, tokenId, songKey, metadata } = await c.req.json()
    
    // Generate mock ArDrive ID
    const arweaveId = `mock-song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Store in mock storage
    mockStorage.songs.set(arweaveId, {
      id: arweaveId,
      encryptedData,
      tokenId,
      songKey,
      metadata,
      createdAt: new Date().toISOString()
    })
    
    // Update order status
    for (const [orderId, order] of mockStorage.orders) {
      if (order.tokenId === tokenId) {
        order.status = 'fulfilled'
        order.songArweaveId = arweaveId
        order.songKey = songKey
        order.fulfilledAt = new Date().toISOString()
        break
      }
    }
    
    console.log(`🎵 Mock song uploaded: ${arweaveId} for token ${tokenId}`)
    
    return c.json({
      success: true,
      arweaveId,
      uri: `ardrive://${arweaveId}`,
      songKey,
      cost: '500' // Mock cost
    })
    
  } catch (error) {
    console.error('Mock song upload failed:', error)
    return c.json({ error: 'Failed to upload song' }, 500)
  }
})

// Get order data (mock)
app.get('/api/orders/:arweaveId', async (c) => {
  try {
    const arweaveId = c.req.param('arweaveId')
    
    const order = mockStorage.orders.get(arweaveId)
    if (!order) {
      return c.json({ error: 'Order not found' }, 404)
    }
    
    return c.json({
      success: true,
      encryptedData: order.encryptedData,
      arweaveId
    })
    
  } catch (error) {
    console.error('Mock order fetch failed:', error)
    return c.json({ error: 'Failed to fetch order' }, 500)
  }
})

// Get song data (mock)
app.get('/api/songs/:arweaveId', async (c) => {
  try {
    const arweaveId = c.req.param('arweaveId')
    
    const song = mockStorage.songs.get(arweaveId)
    if (!song) {
      return c.json({ error: 'Song not found' }, 404)
    }
    
    return c.json({
      success: true,
      encryptedData: song.encryptedData,
      arweaveId
    })
    
  } catch (error) {
    console.error('Mock song fetch failed:', error)
    return c.json({ error: 'Failed to fetch song' }, 500)
  }
})

// List orders for dashboard (mock)
app.get('/api/orders', async (c) => {
  try {
    const orders = Array.from(mockStorage.orders.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return c.json({
      success: true,
      orders
    })
    
  } catch (error) {
    console.error('Mock orders list failed:', error)
    return c.json({ error: 'Failed to list orders' }, 500)
  }
})

// Debug endpoint to see storage
app.get('/api/debug', (c) => {
  return c.json({
    orders: Array.from(mockStorage.orders.entries()),
    songs: Array.from(mockStorage.songs.entries()),
    balance: mockStorage.balance
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Dev server error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

const port = 8787
console.log(`🚀 Birthday Songs API Dev Server running on http://localhost:${port}`)
console.log(`📦 Using localStorage simulation (no real ArDrive uploads)`)

serve({
  fetch: app.fetch,
  port
})