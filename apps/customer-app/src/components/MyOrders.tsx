'use client'

import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { useWalletClient } from 'wagmi'
import { BIRTHDAY_SONGS_ABI, CONTRACT_CONFIG } from '@/lib/contract'
import { downloadSong } from '@/lib/api-dev'

interface MyOrdersProps {
  address: `0x${string}` | undefined
}

interface Order {
  songType: number
  orderDataUri: string
  orderedBy: string
  orderedAt: bigint
  pricePaid: bigint
  fulfilled: boolean
  songUri: string
}

export function MyOrders({ address }: MyOrdersProps) {
  const { data: balance } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: totalOrders } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'totalOrders',
  })

  if (!address) {
    return (
      <div className="bg-white/95 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🔗</div>
        <p className="text-gray-600">Connect wallet to see your songs</p>
      </div>
    )
  }

  const orderCount = balance ? Number(balance) : 0

  if (orderCount === 0) {
    return (
      <div className="bg-white/95 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🎵</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">No songs yet</h2>
        <p className="text-gray-500 text-sm">Order your first custom song!</p>
      </div>
    )
  }

  const total = totalOrders ? Number(totalOrders) : 0
  const tokensToCheck = Math.min(total, 100)

  return (
    <div className="space-y-3">
      <div className="text-center mb-2">
        <span className="bg-white/30 rounded-full px-4 py-1.5 text-white text-sm font-medium">
          {orderCount} {orderCount === 1 ? 'song' : 'songs'}
        </span>
      </div>
      
      {Array.from({ length: tokensToCheck }, (_, i) => tokensToCheck - 1 - i).map((tokenId) => (
        <OrderCard key={tokenId} tokenId={tokenId} userAddress={address} />
      ))}
    </div>
  )
}

function OrderCard({ tokenId, userAddress }: { tokenId: number; userAddress: string }) {
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { data: walletClient } = useWalletClient()

  const { data: owner } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
  })

  const { data: order, isLoading } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'getOrder',
    args: [BigInt(tokenId)],
  })

  // Only show if user owns this token
  if (!owner || owner.toString().toLowerCase() !== userAddress.toLowerCase()) {
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-white/95 rounded-2xl p-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }

  if (!order) return null

  const typedOrder = order as Order
  const orderDate = new Date(Number(typedOrder.orderedAt) * 1000)
  const isBirthday = typedOrder.songType === 0
  const emoji = isBirthday ? '🎂' : '✨'
  const typeName = isBirthday ? 'Birthday Song' : 'Natal Chart Song'
  const price = isBirthday ? '$25' : '$250'

  const handleDownload = async () => {
    if (!walletClient || !typedOrder.songUri) return
    
    setIsDecrypting(true)
    setError(null)

    try {
      // Download song with NFT ownership verification
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${tokenId}/${userAddress}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Download failed')
      }
      
      const { songData } = await response.json()
      
      // Download the song
      downloadSong(songData, `birthday-song-${tokenId}.mp3`)
    } catch (err) {
      console.error('Download error:', err)
      const message = err instanceof Error ? err.message : 'Download failed'
      setError(message.includes('not found') ? 'Song not yet ready' : 'Failed to download. Make sure you own this NFT.')
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <div className="bg-white/95 rounded-2xl p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            {typeName}
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">
            #{tokenId} • {orderDate.toLocaleDateString()} • {price}
          </p>
        </div>
        <span className={`
          px-3 py-1.5 rounded-full text-xs font-semibold
          ${typedOrder.fulfilled 
            ? 'bg-green-100 text-green-700' 
            : 'bg-amber-100 text-amber-700'
          }
        `}>
          {typedOrder.fulfilled ? '✓ Ready' : '⏳ Creating'}
        </span>
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-2">{error}</p>
      )}

      {typedOrder.fulfilled && typedOrder.songUri ? (
        <button
          onClick={handleDownload}
          disabled={isDecrypting}
          className="block w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-4 rounded-xl font-semibold active:scale-98 transition-transform disabled:opacity-50"
        >
          {isDecrypting ? '🔐 Decrypting...' : '⬇️ Download Your Song'}
        </button>
      ) : (
        <div className="text-center py-3 text-gray-400 text-sm">
          Your song is being crafted 🎸
        </div>
      )}
    </div>
  )
}
