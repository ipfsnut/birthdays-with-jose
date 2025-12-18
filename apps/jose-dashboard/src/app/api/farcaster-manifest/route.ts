import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    "accountAssociation": {
      "header": "eyJmaWQiOjU4ODY1NSwiZGVhZGxpbmUiOjE3MzUxOTU4NjEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgxOEE4NWFkMzQxYjJENkEyYmQ2N2ZiYjEwNEI0ODI3QjkyMmEyQTNjIn0",
      "payload": "eyJkb21haW4iOiJiaXJ0aGRheXMtd2l0aC1qb3NlLWRhc2hib2FyZC5wYWdlcy5kZXYifQ",
      "signature": "MHgwZjU4YjJjMGM0MjQwZjQ3ZmNiZTQ1ZjJkOTFlYzk3MDkzMDBmNTUzOTU3MjhkNDY5MWI0YTUzMGJkODRkM2Q2NTdlNWRlZDMzNTM5NWUzYWZkNDNmYWVkN2FlY2ZlYzZkN2I0ZjRkMDE4OGMyZDY5NzQ2NjI4Mzg2NjRmZTkzZTFj"
    },
    "frame": {
      "name": "Jose's Birthday Songs Dashboard",
      "iconUrl": "https://birthdays-with-jose-dashboard.pages.dev/JoseWarplet.png",
      "homeUrl": "https://birthdays-with-jose-dashboard.pages.dev",
      "imageUrl": "https://birthdays-with-jose-dashboard.pages.dev/JoseWarplet.png",
      "buttonTitle": "Open Dashboard",
      "splashImageUrl": "https://birthdays-with-jose-dashboard.pages.dev/JoseWarplet.png",
      "splashBackgroundColor": "#f0f9ff",
      "webhookUrl": "https://birthdays-with-jose-dashboard.pages.dev/api/webhook"
    }
  }

  return NextResponse.json(manifest)
}