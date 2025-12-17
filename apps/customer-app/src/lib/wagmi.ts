import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Optimized for Farcaster miniapp - use latest miniapp connector
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http('https://mainnet.base.org')
  },
  connectors: [
    farcasterMiniApp(), // Latest Farcaster miniapp connector
  ],
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
