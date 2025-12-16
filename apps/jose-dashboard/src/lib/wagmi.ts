import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Always use Base mainnet now that we've deployed
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
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
