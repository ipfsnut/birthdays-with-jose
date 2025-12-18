/**
 * ArDrive Service for Birthday Songs
 * Handles ArDrive/Turbo SDK operations that don't work in Cloudflare Workers
 */

const express = require('express');
const cors = require('cors');
const { TurboFactory } = require('@ardrive/turbo-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://birthdays-with-jose.pages.dev',
    'https://birthday-songs.pages.dev',
    'https://birthdays-with-jose-dashboard.pages.dev',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

// Get Turbo client
function getTurboClient() {
  const privateKey = process.env.ARWEAVE_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('ARWEAVE_PRIVATE_KEY environment variable is not set');
  }
  
  // Ensure private key has 0x prefix for Ethereum
  let formattedKey = privateKey;
  if (!formattedKey.startsWith('0x') && formattedKey.length === 64) {
    formattedKey = '0x' + formattedKey;
  }
  
  console.log('Initializing Turbo client...');
  const turbo = TurboFactory.authenticated({
    privateKey: formattedKey,
    token: 'ethereum'
  });
  
  return turbo;
}

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'ardrive-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Check ArDrive balance
app.get('/api/balance', async (req, res) => {
  try {
    const turbo = getTurboClient();
    const balance = await turbo.getBalance();
    
    res.json({
      credits: balance.winc,
      creditsFormatted: `${balance.winc} winc`,
      status: 'success'
    });
  } catch (error) {
    console.error('Balance check failed:', error);
    res.status(500).json({ error: 'Failed to check balance' });
  }
});

// Upload order data to ArDrive
app.post('/api/orders/upload', async (req, res) => {
  try {
    const { orderData, metadata } = req.body;
    
    console.log('Order upload request received');
    
    if (!orderData) {
      return res.status(400).json({ error: 'Missing orderData in request body' });
    }
    
    const tokenId = metadata?.tokenId || Date.now();
    const turbo = getTurboClient();
    
    // Convert order data to buffer
    const orderDataStr = JSON.stringify(orderData);
    const dataBuffer = Buffer.from(orderDataStr);
    
    console.log('Uploading to ArDrive...');
    const orderUploadResult = await turbo.uploadFile({
      fileStreamFactory: () => dataBuffer,
      fileSizeFactory: () => dataBuffer.length,
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
    });
    
    console.log('Upload successful:', orderUploadResult.id);
    
    // Call Cloudflare Worker to store metadata in D1
    if (process.env.CLOUDFLARE_WORKER_URL) {
      try {
        await fetch(`${process.env.CLOUDFLARE_WORKER_URL}/api/orders/metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenId,
            arweaveId: orderUploadResult.id,
            status: 'pending',
            orderData: orderData
          })
        });
      } catch (dbError) {
        console.error('Failed to update D1 database:', dbError);
      }
    }
    
    res.json({
      success: true,
      arweaveId: orderUploadResult.id,
      uri: `ardrive://${orderUploadResult.id}`,
      tokenId: tokenId,
      cost: orderUploadResult.winc || '0'
    });
    
  } catch (error) {
    console.error('Order upload failed:', error);
    res.status(500).json({ 
      error: 'Failed to upload order',
      details: error.message
    });
  }
});

// Upload song to ArDrive
app.post('/api/songs/upload', async (req, res) => {
  try {
    const { songData, tokenId } = req.body;
    
    console.log('Song upload request received for token:', tokenId);
    
    if (!songData) {
      return res.status(400).json({ error: 'Missing songData in request body' });
    }
    
    if (!tokenId) {
      return res.status(400).json({ error: 'Missing tokenId in request body' });
    }
    
    const turbo = getTurboClient();
    
    // Convert song data to buffer
    const songDataBuffer = Buffer.from(songData);
    
    console.log('Uploading song to ArDrive...');
    const uploadResult = await turbo.uploadFile({
      fileStreamFactory: () => songDataBuffer,
      fileSizeFactory: () => songDataBuffer.length,
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
    });
    
    console.log('Song upload successful:', uploadResult.id);
    
    // Update order status in D1 database via Cloudflare Worker
    if (process.env.CLOUDFLARE_WORKER_URL) {
      try {
        await fetch(`${process.env.CLOUDFLARE_WORKER_URL}/api/orders/fulfill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenId,
            songArweaveId: uploadResult.id
          })
        });
      } catch (dbError) {
        console.error('Failed to update D1 database:', dbError);
      }
    }
    
    res.json({
      success: true,
      arweaveId: uploadResult.id,
      uri: `ardrive://${uploadResult.id}`,
      cost: uploadResult.winc || '0'
    });
    
  } catch (error) {
    console.error('Song upload failed:', error);
    res.status(500).json({ 
      error: 'Failed to upload song',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ArDrive service running on port ${PORT}`);
  console.log(`🔑 Private key configured: ${!!process.env.ARWEAVE_PRIVATE_KEY}`);
  console.log(`🌐 Cloudflare Worker URL: ${process.env.CLOUDFLARE_WORKER_URL || 'Not set'}`);
});