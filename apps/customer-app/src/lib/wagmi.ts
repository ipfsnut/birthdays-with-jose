import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Always use Base mainnet now that we've deployed
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
  },
  connectors: [
    injected(), // MetaMask, browser wallets
    walletConnect({ 
      projectId: '4e0bbee2a17c93edb2f3db9b7c0e8e42', // Public WalletConnect project ID
      metadata: {
        name: 'Jose\'s Birthday Songs',
        description: 'Custom natal chart-inspired melodies',
        url: 'https://birthday-songs.pages.dev',
        icons: ['https://birthday-songs.pages.dev/JoseWarplet.png']
      }
    }),
  ],
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
