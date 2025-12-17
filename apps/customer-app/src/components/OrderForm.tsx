'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContracts, useAccount } from 'wagmi'
import { BIRTHDAY_SONGS_ABI, ERC20_ABI, CONTRACT_CONFIG, USDC_CONFIG, SongType, PRICES, CHAIN_ID } from '@/lib/contract'
import { api, type OrderData as ApiOrderData } from '@/lib/api-dev'

interface OrderFormProps {
  isConnected: boolean
  farcasterUser?: { fid: number; username?: string } | null
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
}

export function OrderForm({ isConnected, farcasterUser }: OrderFormProps) {
  const { address, isConnected: wagmiConnected } = useAccount()
  const [selectedTier, setSelectedTier] = useState<SongType>(SongType.BIRTHDAY)
  
  // Form fields
  const [recipientName, setRecipientName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [message, setMessage] = useState('')
  const [relationship, setRelationship] = useState('')
  const [interests, setInterests] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false)
  const [birthLocation, setBirthLocation] = useState('')
  const [sunSign, setSunSign] = useState('')
  const [risingSign, setRisingSign] = useState('')
  const [moonSign, setMoonSign] = useState('')
  const [musicalStyle, setMusicalStyle] = useState('')
  const [allowPublication, setAllowPublication] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'uploading' | 'approve' | 'mint' | 'success'>('form')
  const [orderDataUri, setOrderDataUri] = useState<string>('')

  // Batch all contract reads including prices into a single multicall
  // Skip user-specific calls if no address is available
  const { data: contractData, refetch: refetchContractData, error: contractError, isLoading: contractLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_CONFIG.address,
        abi: BIRTHDAY_SONGS_ABI,
        functionName: 'birthdayPrice',
        chainId: CHAIN_ID,
      },
      {
        address: CONTRACT_CONFIG.address,
        abi: BIRTHDAY_SONGS_ABI,
        functionName: 'natalPrice',
        chainId: CHAIN_ID,
      },
      ...(address ? [{
        address: USDC_CONFIG.address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CONTRACT_CONFIG.address],
        chainId: CHAIN_ID,
      }] : []),
      ...(address ? [{
        address: USDC_CONFIG.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
        chainId: CHAIN_ID,
      }] : []),
      {
        address: CONTRACT_CONFIG.address,
        abi: BIRTHDAY_SONGS_ABI,
        functionName: 'getSupplyInfo',
        chainId: CHAIN_ID,
      },
    ],
  } as any)

  const birthdayPrice = contractData?.[0]?.result as bigint
  const natalPrice = contractData?.[1]?.result as bigint
  // Dynamic array indices based on whether address exists
  const allowanceIndex = address ? 2 : -1
  const balanceIndex = address ? 3 : -1
  const supplyIndex = address ? 4 : 2
  
  const allowance = allowanceIndex >= 0 ? contractData?.[allowanceIndex]?.result : undefined
  const usdcBalance = balanceIndex >= 0 ? contractData?.[balanceIndex]?.result : undefined
  const supplyInfo = contractData?.[supplyIndex]?.result

  // Use contract price or fallback to hardcoded
  const priceInUSDC = selectedTier === SongType.BIRTHDAY 
    ? birthdayPrice || BigInt(PRICES[selectedTier] * 1e6)
    : natalPrice || BigInt(PRICES[selectedTier] * 1e6)
  
  const priceInDollars = Number(priceInUSDC) / 1e6


  const hasEnoughBalance = usdcBalance ? (usdcBalance as bigint) >= priceInUSDC : false
  const hasEnoughAllowance = allowance ? (allowance as bigint) >= priceInUSDC : false

  // Format supply data from contract
  const formatSupplyInfo = () => {
    if (!supplyInfo) return null
    
    const [
      birthdaysMinted,
      birthdaysRemaining,
      birthdayLimit,
      birthdaysSoldOut,
      natalsMinted,
      natalsRemaining,
      natalLimit,
      natalsSoldOut,
      totalMinted,
      totalRemaining,
      totalLimit
    ] = supplyInfo as readonly [bigint, bigint, bigint, boolean, bigint, bigint, bigint, boolean, bigint, bigint, bigint]

    return {
      birthday: {
        minted: Number(birthdaysMinted),
        remaining: Number(birthdaysRemaining),
        limit: Number(birthdayLimit),
        soldOut: birthdaysSoldOut
      },
      natal: {
        minted: Number(natalsMinted),
        remaining: Number(natalsRemaining),
        limit: Number(natalLimit),
        soldOut: natalsSoldOut
      },
      total: {
        minted: Number(totalMinted),
        remaining: Number(totalRemaining),
        limit: Number(totalLimit)
      }
    }
  }

  const supplyData = formatSupplyInfo()

  const { writeContract: approveUSDC, data: approveTxHash, isPending: isApproving, error: approveError } = useWriteContract()
  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash })

  const { writeContract: mintNFT, data: mintTxHash, isPending: isMinting, error: mintError } = useWriteContract()
  const { isSuccess: isMintConfirmed } = useWaitForTransactionReceipt({ hash: mintTxHash })

  useEffect(() => {
    if (isApproveConfirmed) {
      refetchContractData()
      doMint()
    }
  }, [isApproveConfirmed])

  useEffect(() => {
    if (isMintConfirmed) {
      setStep('success')
      refetchContractData()
    }
  }, [isMintConfirmed, refetchContractData])

  const encryptAndUpload = async (): Promise<string> => {
    // Build order data
    const orderData: OrderData = {
      type: selectedTier === SongType.BIRTHDAY ? 'birthday' : 'natal',
      recipientName,
      orderedBy: address || '',
      orderedAt: new Date().toISOString(),
      allowPublication,
    }

    if (birthDate) orderData.birthDate = birthDate
    if (message) orderData.message = message

    if (selectedTier === SongType.BIRTHDAY) {
      if (relationship) orderData.relationship = relationship
      if (interests) orderData.interests = interests
    } else {
      orderData.birthTime = birthTimeUnknown ? 'unknown' : birthTime
      if (birthLocation) orderData.birthLocation = birthLocation
      if (sunSign) orderData.sunSign = sunSign
      if (moonSign) orderData.moonSign = moonSign
      if (risingSign) orderData.risingSign = risingSign
      if (musicalStyle) orderData.musicalStyle = musicalStyle
    }

    // Upload order data via API worker
    setStep('uploading')
    
    try {
      // Upload via API worker (which handles encryption and ArDrive)
      const result = await api.uploadOrder(orderData as ApiOrderData)
      
      // Return ArDrive URI that points to the encrypted file
      return `ardrive://${result.arweaveId}`
    } catch (error) {
      console.error('API upload failed:', error)
      // For testing, return a mock URI
      return `mock://order-${Date.now()}`
    }
  }

  const doMint = () => {
    if (!orderDataUri) return
    setStep('mint')
    mintNFT({
      address: CONTRACT_CONFIG.address,
      abi: BIRTHDAY_SONGS_ABI,
      functionName: selectedTier === SongType.BIRTHDAY ? 'mintBirthdaySong' : 'mintNatalSong',
      args: [orderDataUri],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // In Farcaster context, skip wallet connection check - Privy handles it
    if (!isConnected) {
      setError('Please connect your wallet')
      return
    }
    if (!recipientName.trim()) {
      setError('Enter recipient\'s name')
      return
    }
    if (selectedTier === SongType.NATAL && !birthDate) {
      setError('Birth date required for natal chart')
      return
    }
    if (selectedTier === SongType.NATAL && !birthLocation.trim()) {
      setError('Birth location required for natal chart')
      return
    }
    // Skip balance check in Farcaster context - Privy will handle insufficient funds
    if (!farcasterUser && !hasEnoughBalance) {
      setError(`Need $${priceInDollars.toFixed(2)} USDC`)
      return
    }

    // Check if tier is sold out
    if (supplyData) {
      const tierSupply = selectedTier === SongType.BIRTHDAY ? supplyData.birthday : supplyData.natal
      if (tierSupply.soldOut) {
        setError(`${selectedTier === SongType.BIRTHDAY ? 'Birthday Songs' : 'Natal Chart Songs'} are sold out!`)
        return
      }
    }

    try {
      const uri = await encryptAndUpload()
      setOrderDataUri(uri)
      
      if (!hasEnoughAllowance) {
        setStep('approve')
        approveUSDC({
          address: USDC_CONFIG.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_CONFIG.address, priceInUSDC],
        })
      } else {
        setStep('mint')
        mintNFT({
          address: CONTRACT_CONFIG.address,
          abi: BIRTHDAY_SONGS_ABI,
          functionName: selectedTier === SongType.BIRTHDAY ? 'mintBirthdaySong' : 'mintNatalSong',
          args: [uri],
        })
      }
    } catch (err) {
      console.error('Order error:', err)
      setError('Failed to prepare order')
      setStep('form')
    }
  }

  const resetForm = () => {
    setRecipientName(''); setBirthDate(''); setMessage('')
    setRelationship(''); setInterests('')
    setBirthTime(''); setBirthTimeUnknown(false); setBirthLocation('')
    setSunSign(''); setRisingSign(''); setMoonSign(''); setMusicalStyle('')
    setAllowPublication(false)
    setOrderDataUri(''); setStep('form'); setError(null)
  }

  const displayError = error || 
    (approveError?.message?.slice(0, 50)) || 
    (mintError?.message?.slice(0, 50))

  if (step === 'success') {
    return (
      <div className="bg-white/95 rounded-2xl p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Order Placed!</h2>
        <p className="text-gray-600 mb-4">
          Jose is creating your {selectedTier === SongType.BIRTHDAY ? 'birthday song' : 'natal chart song'}!
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Check "My Songs" tab to download once Jose fulfills your order.
        </p>
        <a
          href={`https://basescan.org/tx/${mintTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 text-sm"
        >
          View transaction →
        </a>
        <button
          onClick={resetForm}
          className="mt-4 w-full bg-blue-600 active:bg-blue-700 text-white font-semibold py-4 rounded-xl"
        >
          Order Another
        </button>
      </div>
    )
  }

  const isProcessing = step !== 'form'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-4 border border-white/50">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Welcome to Jose's Musical Universe 🎸</h3>
        <p className="text-sm text-gray-600">
          Get a personalized birthday song crafted with love and natal chart inspiration. 
          Each song is uniquely composed based on your special details.
        </p>
      </div>

      {/* Limited Edition Banner */}
      {supplyData && (
        <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-orange-800 mb-1">🔥 Limited Edition Collection</h4>
              <p className="text-sm text-orange-700">
                Only {supplyData.total.limit} total songs available!
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-orange-800">
                {supplyData.total.remaining}/{supplyData.total.limit}
              </div>
              <div className="text-xs text-orange-600">remaining</div>
            </div>
          </div>
          {supplyData.total.remaining <= 10 && supplyData.total.remaining > 0 && (
            <div className="mt-2 text-xs text-orange-700 font-medium">
              ⚡ Hurry! Only {supplyData.total.remaining} songs left
            </div>
          )}
        </div>
      )}

      <div className="bg-white/95 rounded-2xl p-4">
      {/* Tier Selection */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <TierCard
          selected={selectedTier === SongType.BIRTHDAY}
          onClick={() => !isProcessing && setSelectedTier(SongType.BIRTHDAY)}
          emoji="🎂"
          title="Birthday Song"
          price={birthdayPrice ? Number(birthdayPrice) / 1e6 : 25}
          color="blue"
          disabled={isProcessing}
          supplyInfo={supplyData?.birthday}
        />
        <TierCard
          selected={selectedTier === SongType.NATAL}
          onClick={() => !isProcessing && setSelectedTier(SongType.NATAL)}
          emoji="🌟"
          title="Natal Chart Song"
          price={natalPrice ? Number(natalPrice) / 1e6 : 250}
          color="purple"
          disabled={isProcessing}
          supplyInfo={supplyData?.natal}
        />
      </div>

      {/* Form Fields */}
      <div className="space-y-3">
        <Input
          label="Recipient's Name"
          value={recipientName}
          onChange={setRecipientName}
          placeholder="Who is this for?"
          required
          disabled={isProcessing}
        />

        <Input
          type="date"
          label={selectedTier === SongType.NATAL ? "Birth Date *" : "Birth Date"}
          value={birthDate}
          onChange={setBirthDate}
          required={selectedTier === SongType.NATAL}
          disabled={isProcessing}
        />

        {selectedTier === SongType.BIRTHDAY ? (
          <>
            <Select
              label="Your Relationship"
              value={relationship}
              onChange={setRelationship}
              options={[
                { value: '', label: 'Select...' },
                { value: 'friend', label: 'Friend' },
                { value: 'partner', label: 'Partner / Spouse' },
                { value: 'parent', label: 'Parent' },
                { value: 'child', label: 'Child' },
                { value: 'sibling', label: 'Sibling' },
                { value: 'coworker', label: 'Coworker' },
                { value: 'other', label: 'Other' },
              ]}
              disabled={isProcessing}
            />
            <TextArea
              label="Their Interests"
              value={interests}
              onChange={setInterests}
              placeholder="Hobbies, personality, inside jokes..."
              disabled={isProcessing}
            />
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birth Time</label>
              <div className="flex gap-3 items-center">
                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  disabled={isProcessing || birthTimeUnknown}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-800 disabled:opacity-50"
                />
                <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={birthTimeUnknown}
                    onChange={(e) => setBirthTimeUnknown(e.target.checked)}
                    disabled={isProcessing}
                    className="w-5 h-5 rounded"
                  />
                  Unknown
                </label>
              </div>
            </div>

            <Input
              label="Birth Location *"
              value={birthLocation}
              onChange={setBirthLocation}
              placeholder="City, State, Country"
              required
              disabled={isProcessing}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Known Signs (optional)</label>
              <div className="grid grid-cols-3 gap-2">
                <SignSelect label="☀️ Sun" value={sunSign} onChange={setSunSign} disabled={isProcessing} />
                <SignSelect label="🌙 Moon" value={moonSign} onChange={setMoonSign} disabled={isProcessing} />
                <SignSelect label="⬆️ Rising" value={risingSign} onChange={setRisingSign} disabled={isProcessing} />
              </div>
            </div>

            <Input
              label="Musical Style"
              value={musicalStyle}
              onChange={setMusicalStyle}
              placeholder="indie folk, R&B, orchestral..."
              disabled={isProcessing}
            />
          </>
        )}

        <TextArea
          label="Special Requests"
          value={message}
          onChange={setMessage}
          placeholder="Anything else to include..."
          disabled={isProcessing}
        />

        {/* Publication Permission */}
        <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-orange-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPublication}
              onChange={(e) => setAllowPublication(e.target.checked)}
              disabled={isProcessing}
              className="w-5 h-5 rounded mt-0.5 text-orange-500 focus:ring-orange-300"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-800 mb-1">
                ✨ Publication Permission
              </div>
              <div className="text-sm text-gray-600 leading-relaxed">
                I give Jose permission to publish this song independently on or after the recipient's special day. 
                This helps support Jose's artistry while keeping your song exclusive until then.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Balance */}
      {isConnected && usdcBalance !== undefined && (
        <div className="mt-4 text-center">
          <span className="text-gray-500 text-sm">Balance: </span>
          <span className={`text-sm font-medium ${hasEnoughBalance ? 'text-green-600' : 'text-red-500'}`}>
            ${(Number(usdcBalance) / 1e6).toFixed(2)} USDC
          </span>
        </div>
      )}
      
      {/* Debug info for troubleshooting - always show for now */}
      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
        <div>isConnected (prop): {String(isConnected)}</div>
        <div>wagmiConnected: {String(wagmiConnected)}</div>
        <div>address: {address || 'none'}</div>
        <div>farcasterUser: {farcasterUser ? `@${farcasterUser.username}` : 'none'}</div>
        <div>hasEnoughBalance: {String(hasEnoughBalance)}</div>
        <div>usdcBalance: {usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : 'loading'}</div>
        <div>contractData: {contractData ? 'loaded' : 'loading'}</div>
        <div>contractError: {contractError ? String(contractError) : 'ok'}</div>
        <div>contractLoading: {String(contractLoading)}</div>
        <div>priceInUSDC: {priceInUSDC.toString()}</div>
        <div>supplyInfo: {supplyInfo ? 'loaded' : 'loading'}</div>
      </div>

      {/* Error */}
      {displayError && (
        <div className="mt-3 p-3 bg-red-50 rounded-xl">
          <p className="text-red-700 text-sm text-center">{displayError}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isConnected || isProcessing || (!farcasterUser && !hasEnoughBalance) || !!(supplyData && (selectedTier === SongType.BIRTHDAY ? supplyData.birthday.soldOut : supplyData.natal.soldOut))}
        className={`
          mt-4 w-full py-4 rounded-xl font-bold text-base transition-all active:scale-98
          ${isConnected && (farcasterUser || hasEnoughBalance) && !isProcessing && (!supplyData || !(selectedTier === SongType.BIRTHDAY ? supplyData.birthday.soldOut : supplyData.natal.soldOut))
            ? selectedTier === SongType.NATAL
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg active:shadow-md'
              : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg active:shadow-md'
            : 'bg-gray-200 text-gray-400'
          }
        `}
      >
        {supplyData && (selectedTier === SongType.BIRTHDAY ? supplyData.birthday.soldOut : supplyData.natal.soldOut) ? 'SOLD OUT' :
         step === 'uploading' ? '📤 Uploading order...' :
         step === 'approve' || isApproving ? 'Approve USDC...' :
         step === 'mint' || isMinting ? 'Confirming...' :
         `Pay $${priceInDollars.toFixed(2)} USDC`}
      </button>

      </div>
    </form>
  )
}

// Reusable Components

function TierCard({ selected, onClick, emoji, title, price, color, disabled, supplyInfo }: {
  selected: boolean; onClick: () => void; emoji: string; title: string; price: number; color: 'blue' | 'purple'; disabled?: boolean; supplyInfo?: any
}) {
  const borderColor = selected ? (color === 'purple' ? 'border-purple-500' : 'border-blue-500') : 'border-gray-200'
  const bgColor = selected ? (color === 'purple' ? 'bg-purple-50' : 'bg-blue-50') : 'bg-white'
  const priceColor = color === 'purple' ? 'text-purple-600' : 'text-blue-600'
  
  const isSoldOut = supplyInfo?.soldOut
  const remaining = supplyInfo?.remaining || 0
  const limit = supplyInfo?.limit || 25
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSoldOut}
      className={`p-4 rounded-xl border-2 text-left active:scale-95 transition-all relative ${
        isSoldOut 
          ? 'border-red-200 bg-red-50 opacity-75' 
          : `${borderColor} ${bgColor}`
      } ${(disabled || isSoldOut) ? 'opacity-60' : ''}`}
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="font-bold text-gray-800 text-sm">{title}</div>
      <div className={`font-bold ${isSoldOut ? 'text-red-500' : priceColor}`}>
        {isSoldOut ? 'SOLD OUT' : `$${price.toFixed(2)}`}
      </div>
      {supplyInfo && (
        <div className={`text-xs mt-1 ${
          isSoldOut 
            ? 'text-red-600' 
            : remaining <= 5 
              ? 'text-orange-600' 
              : 'text-gray-500'
        }`}>
          {isSoldOut 
            ? `${limit}/${limit} minted` 
            : remaining <= 10
              ? `${remaining}/${limit} left`
              : `Limited: ${limit} only`
          }
        </div>
      )}
    </button>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', required, disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 disabled:opacity-50"
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 resize-none disabled:opacity-50"
      />
    </div>
  )
}

function Select({ label, value, onChange, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 disabled:opacity-50 bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function SignSelect({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  const signs = ['', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1 text-center">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-2 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white"
      >
        {signs.map(s => <option key={s} value={s}>{s || '—'}</option>)}
      </select>
    </div>
  )
}
