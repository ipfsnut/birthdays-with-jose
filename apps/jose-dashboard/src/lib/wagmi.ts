import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'

// Always use Base mainnet now that we've deployed
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
  },
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Jose's Birthday Songs",
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
    }),
    injected(), // Fallback for other injected wallets
    coinbaseWallet({
      appName: "Jose's Birthday Songs",
      appLogoUrl: typeof window !== 'undefined' ? `${window.location.origin}/JoseWarplet.png` : '',
    }),
  ],
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
