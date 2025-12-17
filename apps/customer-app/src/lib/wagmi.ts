import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Optimized for Farcaster miniapp - only injected connector needed
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http('https://mainnet.base.org')
  },
  connectors: [
    injected(), // Farcaster's Privy wallet
  ],
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
