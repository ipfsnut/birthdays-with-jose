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

  // Always show creator dashboard - Jose will use this URL
  const isCreator = true

  // Verify contract connection
  const { data: birthdayPrice, isError: priceError } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'birthdayPrice',
  })

  // Initialize Farcaster SDK (temporarily disabled)
  useEffect(() => {
    const initSDK = async () => {
      try {
        // const context = await sdk.context
        // if (context?.user) {
        //   setFarcasterUser({
        //     fid: context.user.fid,
        //     username: context.user.username,
        //   })
        // }
        // await sdk.actions.ready()
        setIsSDKLoaded(true)
      } catch (error) {
        console.error('SDK init error:', error)
        setIsSDKLoaded(true)
      }
    }
    initSDK()
  }, [])

  // Manual connect function - don't auto-connect for dashboard
  const handleConnect = async () => {
    console.log('Connect button clicked, connectors:', connectors)
    
    // Prefer MetaMask first, then injected, then others
    const metaMaskConnector = connectors.find(c => c.id === 'metaMaskSDK')
    const injectedConnector = connectors.find(c => c.id === 'injected')
    
    const preferredConnector = metaMaskConnector || injectedConnector || connectors[0]
    
    if (preferredConnector) {
      console.log('Attempting to connect with connector:', preferredConnector)
      try {
        await connect({ connector: preferredConnector })
      } catch (error) {
        console.error('Connection failed:', error)
        // Try fallback to injected if MetaMask failed
        if (preferredConnector !== injectedConnector && injectedConnector) {
          console.log('Trying fallback injected connector')
          await connect({ connector: injectedConnector })
        }
      }
    }
  }

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
              <p className="text-white/70 text-xs">Custom astrology-inspired melodies</p>
            </div>
          </div>
          
          {isConnected ? (
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-white text-xs font-medium">
                {farcasterUser?.username ? `@${farcasterUser.username}` : `${address?.slice(0, 4)}...${address?.slice(-3)}`}
              </span>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="bg-white/20 active:bg-white/30 rounded-full px-3 py-1.5 text-white text-xs font-medium"
            >
              Connect
            </button>
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
        {activeTab === 'order' && <OrderForm isConnected={isConnected} />}
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
