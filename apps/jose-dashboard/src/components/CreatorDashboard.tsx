'use client'

import { useState, useEffect, useRef } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient } from 'wagmi'
import { parseEther } from 'viem'
import { BIRTHDAY_SONGS_ABI, ERC20_ABI, CONTRACT_CONFIG, USDC_CONFIG, PLATFORM_FEE } from '@/lib/contract'
import { 
  api,
  fileToBase64,
  type OrderData
} from '@/lib/api-dev'

interface Order {
  songType: number
  orderDataUri: string
  orderedBy: string
  orderedAt: bigint
  pricePaid: bigint
  fulfilled: boolean
  songUri: string
}

interface DecryptedOrderData {
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
  orderedAt: string
  orderedBy: string
  allowPublication: boolean
}

export function CreatorDashboard() {
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const [decryptedData, setDecryptedData] = useState<DecryptedOrderData | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [songFile, setSongFile] = useState<File | null>(null)
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'fulfilling'>('idle')
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: walletClient } = useWalletClient()

  // Contract data
  const { data: contractBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_CONFIG.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACT_CONFIG.address],
  })

  const { data: totalOrders, refetch: refetchTotal } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'totalOrders',
  })

  const { data: platformFee } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'platformFee',
  })

  // Withdraw
  const { writeContract: withdraw, data: withdrawTxHash, isPending: isWithdrawing, error: withdrawError } = useWriteContract()
  const { isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash })

  // Fulfill
  const { writeContract: fulfillOrder, data: fulfillTxHash, isPending: isFulfilling, error: fulfillError } = useWriteContract()
  const { isSuccess: fulfillSuccess } = useWaitForTransactionReceipt({ hash: fulfillTxHash })

  useEffect(() => {
    if (withdrawSuccess) refetchBalance()
  }, [withdrawSuccess, refetchBalance])

  useEffect(() => {
    if (fulfillSuccess) {
      setSongFile(null)
      setSelectedOrder(null)
      setDecryptedData(null)
      setUploadStep('idle')
      refetchTotal()
    }
  }, [fulfillSuccess, refetchTotal])

  // Decrypt order when selected
  useEffect(() => {
    const decryptOrder = async () => {
      if (selectedOrder === null || !walletClient) return
      
      setIsDecrypting(true)
      setDecryptedData(null)
      setError(null)

      try {
        // Fetch order from contract
        // We'll need to read from contract here - using a different approach
      } catch (err) {
        console.error('Decrypt error:', err)
        setError('Failed to decrypt order')
      } finally {
        setIsDecrypting(false)
      }
    }

    decryptOrder()
  }, [selectedOrder, walletClient])

  const handleWithdraw = () => {
    withdraw({
      address: CONTRACT_CONFIG.address,
      abi: BIRTHDAY_SONGS_ABI,
      functionName: 'withdraw',
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setSongFile(file)
    } else {
      setError('Please select an audio file')
    }
  }

  const handleUploadAndFulfill = async () => {
    if (selectedOrder === null || !songFile || !walletClient) return

    setError(null)

    try {
      // Convert file to base64
      setUploadStep('uploading')
      const base64 = await fileToBase64(songFile)

      // Upload song via API worker (handles ArDrive and encryption)
      const result = await api.uploadSong(selectedOrder, base64)
      const fileId = result.arweaveId

      // Create ArDrive URI for the song
      const songUri = `ardrive://${fileId}`
      
      // Note: In production, we'd store the songKey in NFT metadata
      // so the NFT holder can access their song

      // Fulfill order on-chain (no ETH fee needed anymore)
      setUploadStep('fulfilling')

      fulfillOrder({
        address: CONTRACT_CONFIG.address,
        abi: BIRTHDAY_SONGS_ABI,
        functionName: 'fulfillOrder',
        args: [BigInt(selectedOrder), songUri],
      })
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload song')
      setUploadStep('idle')
    }
  }

  const balanceUSD = contractBalance ? Number(contractBalance) / 1e6 : 0
  const total = totalOrders ? Number(totalOrders) : 0
  const feeEth = platformFee ? Number(platformFee) / 1e18 : Number(PLATFORM_FEE)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="bg-white/95 rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-500">Orders</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">${balanceUSD.toFixed(0)}</p>
            <p className="text-xs text-gray-500">USDC</p>
          </div>
        </div>
        
        <button
          onClick={handleWithdraw}
          disabled={isWithdrawing || balanceUSD === 0}
          className={`
            w-full mt-3 py-4 rounded-xl font-semibold text-base active:scale-98 transition-all
            ${balanceUSD > 0 
              ? 'bg-green-500 text-white active:bg-green-600' 
              : 'bg-gray-200 text-gray-400'
            }
          `}
        >
          {isWithdrawing ? 'Withdrawing...' : `💰 Withdraw $${balanceUSD.toFixed(2)}`}
        </button>
        {withdrawError && <p className="text-red-500 text-xs mt-2 text-center">{withdrawError.message?.slice(0, 40)}</p>}
        {withdrawSuccess && <p className="text-green-600 text-xs mt-2 text-center">✓ Withdrawn!</p>}
      </div>

      {/* Fulfill Section */}
      <div className="bg-white/95 rounded-2xl p-4">
        <h2 className="font-bold text-gray-800 mb-3">🎵 Fulfill Order</h2>
        
        {/* Order Selection */}
        {total > 0 ? (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Select pending order:</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {Array.from({ length: Math.min(total, 30) }, (_, i) => total - 1 - i).map((tokenId) => (
                <OrderPill
                  key={tokenId}
                  tokenId={tokenId}
                  selected={selectedOrder === tokenId}
                  onSelect={() => {
                    setSelectedOrder(tokenId)
                    setDecryptedData(null)
                    setSongFile(null)
                    setError(null)
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">No orders yet</p>
        )}

        {/* Debug Panel */}
        {selectedOrder !== null && (
          <DebugPanel tokenId={selectedOrder} />
        )}

        {/* Selected Order Details */}
        {selectedOrder !== null && (
          <OrderDetails
            tokenId={selectedOrder}
            decryptedData={decryptedData}
            setDecryptedData={setDecryptedData}
            isDecrypting={isDecrypting}
            setIsDecrypting={setIsDecrypting}
            walletClient={walletClient}
          />
        )}

        {/* File Upload */}
        {selectedOrder !== null && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Song</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              {songFile ? `📁 ${songFile.name}` : '📂 Select audio file...'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}


        {/* Upload & Fulfill Button */}
        {selectedOrder !== null && songFile && (
          <button
            onClick={handleUploadAndFulfill}
            disabled={uploadStep !== 'idle' || isFulfilling}
            className="w-full mt-3 py-4 bg-purple-500 text-white rounded-xl font-semibold active:scale-98 transition-all disabled:opacity-50"
          >
            {uploadStep === 'uploading' ? '📤 Uploading song...' :
             uploadStep === 'fulfilling' || isFulfilling ? '⛓️ Confirming on-chain...' :
             '✓ Upload & Deliver'}
          </button>
        )}

        {fulfillError && <p className="text-red-500 text-xs mt-2 text-center">{fulfillError.message?.slice(0, 40)}</p>}
        {fulfillSuccess && <p className="text-green-600 text-xs mt-2 text-center">✓ Order fulfilled!</p>}
      </div>
    </div>
  )
}

function OrderPill({ tokenId, selected, onSelect }: { tokenId: number; selected: boolean; onSelect: () => void }) {
  const { data: order } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'getOrder',
    args: [BigInt(tokenId)],
  })

  const typedOrder = order as Order | undefined
  const emoji = typedOrder?.songType === 0 ? '🎂' : '✨'
  const isFulfilled = typedOrder?.fulfilled

  // Skip fulfilled orders in selection
  if (isFulfilled) return null

  return (
    <button
      onClick={onSelect}
      className={`
        px-3 py-2 rounded-xl text-sm font-medium active:scale-95 transition-all flex items-center gap-1.5
        ${selected 
          ? 'bg-blue-500 text-white' 
          : 'bg-amber-100 text-amber-700'
        }
      `}
    >
      <span>{emoji}</span>
      <span>#{tokenId}</span>
    </button>
  )
}

function OrderDetails({ tokenId, decryptedData, setDecryptedData, isDecrypting, setIsDecrypting, walletClient }: {
  tokenId: number
  decryptedData: DecryptedOrderData | null
  setDecryptedData: (d: DecryptedOrderData | null) => void
  isDecrypting: boolean
  setIsDecrypting: (v: boolean) => void
  walletClient: any
}) {
  const { data: order, isLoading } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'getOrder',
    args: [BigInt(tokenId)],
  })

  useEffect(() => {
    const decrypt = async () => {
      if (!order || decryptedData || isDecrypting || !walletClient) return

      const typedOrder = order as Order
      if (!typedOrder.orderDataUri) return

      setIsDecrypting(true)

      try {
        // Fetch and decrypt from ArDrive private drive
        // Extract file ID from ArDrive URI
        const fileId = typedOrder.orderDataUri.replace('ardrive://', '').replace('mock://', '')
        console.log('🔍 Decrypting order:', { tokenId, orderDataUri: typedOrder.orderDataUri, fileId })
        
        // Fetch and decrypt order data via API
        const data = await api.fetchOrder(fileId)
        console.log('📋 Raw decrypted data:', data)
        console.log('📋 recipientName:', data?.recipientName)
        
        // Ensure we have the data and it's in the right format
        if (data && typeof data === 'object' && data.recipientName) {
          setDecryptedData(data as DecryptedOrderData)
          console.log('✅ State set successfully')
        } else {
          console.error('❌ Invalid data structure:', data)
          setDecryptedData(null)
        }
      } catch (err) {
        console.error('❌ Decrypt error:', err)
        setDecryptedData(null)
      } finally {
        setIsDecrypting(false)
      }
    }

    decrypt()
  }, [order, isDecrypting, walletClient, setDecryptedData, setIsDecrypting])

  if (isLoading) return <div className="bg-blue-50 rounded-xl p-3 animate-pulse h-20"></div>

  const typedOrder = order as Order
  const isBirthday = typedOrder?.songType === 0

  return (
    <div className="bg-blue-50 rounded-xl p-3 text-sm space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-800">
          {isBirthday ? '🎂 Birthday' : '✨ Natal'} #{tokenId}
        </span>
        <span className="text-xs text-gray-500">
          ${Number(typedOrder?.pricePaid || 0) / 1e6}
        </span>
      </div>

      {isDecrypting && <p className="text-gray-500 italic text-xs">🔐 Decrypting order details...</p>}

      {decryptedData && decryptedData.recipientName && (
        <div className="border-t border-blue-200 pt-2 mt-2 space-y-1 text-gray-700">
          <p><span className="font-medium">For:</span> {decryptedData.recipientName}</p>
          {decryptedData.birthDate && <p><span className="font-medium">Birth:</span> {decryptedData.birthDate}</p>}
          
          {decryptedData.type === 'birthday' && (
            <>
              {decryptedData.relationship && <p><span className="font-medium">Relationship:</span> {decryptedData.relationship}</p>}
              {decryptedData.interests && <p><span className="font-medium">Interests:</span> {decryptedData.interests}</p>}
            </>
          )}
          
          {decryptedData.type === 'natal' && (
            <>
              {decryptedData.birthTime && <p><span className="font-medium">Time:</span> {decryptedData.birthTime}</p>}
              {decryptedData.birthLocation && <p><span className="font-medium">Location:</span> {decryptedData.birthLocation}</p>}
              {(decryptedData.sunSign || decryptedData.moonSign || decryptedData.risingSign) && (
                <p><span className="font-medium">Signs:</span> {[
                  decryptedData.sunSign && `☀️${decryptedData.sunSign}`,
                  decryptedData.moonSign && `🌙${decryptedData.moonSign}`,
                  decryptedData.risingSign && `⬆️${decryptedData.risingSign}`
                ].filter(Boolean).join(' ')}</p>
              )}
              {decryptedData.musicalStyle && <p><span className="font-medium">Style:</span> {decryptedData.musicalStyle}</p>}
            </>
          )}
          
          {decryptedData.message && <p><span className="font-medium">Notes:</span> <span className="italic">{decryptedData.message}</span></p>}
          
          <div className={`mt-2 pt-2 border-t border-blue-200 text-xs ${
            decryptedData.allowPublication ? 'text-green-700' : 'text-orange-700'
          }`}>
            <span className="font-medium">Publication:</span> {
              decryptedData.allowPublication 
                ? '✓ Allowed after special day' 
                : '✗ Private only'
            }
          </div>
        </div>
      )}
    </div>
  )
}

function DebugPanel({ tokenId }: { tokenId: number }) {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const { data: order } = useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: BIRTHDAY_SONGS_ABI,
    functionName: 'getOrder',
    args: [BigInt(tokenId)],
  })

  useEffect(() => {
    const checkAPICall = async () => {
      const typedOrder = order as Order
      const fileId = typedOrder?.orderDataUri?.replace('ardrive://', '').replace('mock://', '') || 'no-uri'
      
      setDebugInfo({
        tokenId,
        orderDataUri: typedOrder?.orderDataUri || 'no-uri',
        expectedFileId: fileId,
        apiEndpoint: `/api/orders/${fileId}`,
        fetchMethod: 'api.fetchOrder()'
      })
    }

    if (order) {
      checkAPICall()
    }
  }, [order, tokenId])

  if (!debugInfo) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3 text-xs">
      <div className="font-bold text-yellow-800 mb-2">🐛 Debug Info</div>
      <div className="space-y-1 text-yellow-700">
        <div><strong>Token:</strong> #{debugInfo.tokenId}</div>
        <div><strong>Order URI:</strong> {debugInfo.orderDataUri}</div>
        <div><strong>Looking for file:</strong> {debugInfo.expectedFileId}</div>
        <div><strong>API call:</strong> {debugInfo.apiEndpoint}</div>
        <div><strong>Method:</strong> {debugInfo.fetchMethod}</div>
      </div>
    </div>
  )
}
