/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production' 
      ? 'https://birthday-songs-api-prod.dylan-259.workers.dev'
      : 'http://localhost:8787',
    NEXT_PUBLIC_ARDRIVE_URL: process.env.NODE_ENV === 'production'
      ? 'https://birthdays-with-jose-production.up.railway.app'
      : 'http://localhost:3002'
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: '/api/farcaster-manifest',
      },
    ]
  },
}

module.exports = nextConfig
