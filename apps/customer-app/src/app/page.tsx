'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useReadContract } from 'wagmi'
import Image from 'next/image'
import { BIRTHDAY_SONGS_ABI, CONTRACT_CONFIG, CREATOR_ADDRESS } from '@/lib/contract'
import { OrderForm } from '@/components/OrderForm'
import { MyOrders } from '@/components/MyOrders'
import { CreatorDashboard } from '@/components/CreatorDashboard'

type Tab = 'order' | 'my-songs' | 'creator'

export default function Home() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('order')
  const [farcasterUser, setFarcasterUser] = useState<{ fid: number; username?: string } | null>(null)

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  // Check if user is creator
  const isCreator = address?.toLowerCase() === CREATOR_ADDRESS.toLowerCase()

  // Verify contract connection
  const { data: birthdayPrice, isError: priceError } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'birthdayPrice',
  })

  // Initialize Farcaster Miniapp SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        
        // Get user context from Farcaster
        const context = await sdk.context
        if (context?.user) {
          setFarcasterUser({
            fid: context.user.fid,
            username: context.user.username,
          })
        }
        
        // Signal ready to Farcaster
        await sdk.actions.ready()
        setIsSDKLoaded(true)
      } catch (error) {
        console.error('Farcaster SDK error:', error)
        setIsSDKLoaded(true)
      }
    }
    initSDK()
  }, [])

  // Auto-connect wagmi to Farcaster's embedded wallet
  useEffect(() => {
    if (farcasterUser && !isConnected && connectors.length > 0 && isSDKLoaded) {
      console.log('Attempting auto-connect to Privy wallet...', { connectors: connectors.map(c => c.id) })
      // Farcaster has Privy wallet embedded - try connecting wagmi to it
      const injectedConnector = connectors.find(c => c.id === 'injected')
      if (injectedConnector) {
        console.log('Found injected connector, connecting...')
        connect({ connector: injectedConnector })
          .then(() => console.log('Wagmi connected successfully'))
          .catch((err) => console.log('Wagmi connection failed:', err))
      }
    }
  }, [farcasterUser, isConnected, connectors, isSDKLoaded, connect])
  
  // Force reconnect periodically if still not connected but should be
  useEffect(() => {
    if (farcasterUser && !isConnected && isSDKLoaded) {
      const interval = setInterval(() => {
        const injectedConnector = connectors.find(c => c.id === 'injected')
        if (injectedConnector && !isConnected) {
          console.log('Retrying wagmi connection...')
          connect({ connector: injectedConnector }).catch(() => {})
        }
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [farcasterUser, isConnected, isSDKLoaded, connectors, connect])

  // Manual connect (disabled - now handled by auto-connect above)
  // useEffect(() => {
  //   if (isSDKLoaded && !isConnected && connectors.length > 0) {
  //     connect({ connector: connectors[0] })
  //   }
  // }, [isSDKLoaded, isConnected, connect, connectors])

  if (!isSDKLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <main className="min-h-[100dvh] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pt-2 pb-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 animate-float">
              <Image
                src="/JoseWarplet.png"
                alt="Jose"
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Jose's Birthday Songs</h1>
              <p className="text-white/70 text-xs">Custom natal chart-inspired melodies</p>
            </div>
          </div>
          
          {farcasterUser && (
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-white text-xs font-medium">
                @{farcasterUser.username}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Contract status */}
      {priceError && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-500/20 rounded-xl">
          <p className="text-white text-xs text-center">⚠️ Contract not deployed yet</p>
        </div>
      )}

      {/* Tabs */}
      <nav className="flex-shrink-0 flex gap-2 px-4 pb-3">
        <TabButton active={activeTab === 'order'} onClick={() => setActiveTab('order')}>
          🎂 Order
        </TabButton>
        <TabButton active={activeTab === 'my-songs'} onClick={() => setActiveTab('my-songs')}>
          🎵 My Songs
        </TabButton>
        {isCreator && (
          <TabButton active={activeTab === 'creator'} onClick={() => setActiveTab('creator')}>
            ✨ Jose's Studio
          </TabButton>
        )}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 safe-bottom">
        {activeTab === 'order' && <OrderForm isConnected={!!farcasterUser} farcasterUser={farcasterUser} />}
        {activeTab === 'my-songs' && <MyOrders address={address} />}
        {activeTab === 'creator' && isCreator && <CreatorDashboard />}
      </div>
    </main>
  )
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95
        ${active 
          ? 'bg-white text-blue-600 shadow-lg' 
          : 'bg-white/20 text-white active:bg-white/30'
        }
      `}
    >
      {children}
    </button>
  )
}
