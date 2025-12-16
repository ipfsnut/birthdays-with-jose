import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Use localhost for development, base for production
const isProduction = process.env.NODE_ENV === 'production'

// Define our Anvil localhost chain
const anvilChain = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
})

export const config = createConfig({
  chains: isProduction ? [base] : [anvilChain],
  transports: {
    ...(isProduction ? { [base.id]: http() } : {}),
    ...(!isProduction ? { [anvilChain.id]: http('http://127.0.0.1:8545') } : {}),
  },
  connectors: [
    injected(), // MetaMask, WalletConnect, etc.
  ],
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
