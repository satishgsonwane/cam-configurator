import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { blobs } = await list()
    const configBlob = blobs.find(blob => blob.pathname === 'config/config.json')
    
    if (!configBlob) {
      // Return default config if no blob exists
      return NextResponse.json({ camera_config: [] })
    }

    // Add cache-busting query parameter
    const url = new URL(configBlob.url)
    url.searchParams.append('t', Date.now().toString())

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch configuration')
    }

    const config = await response.json()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Error fetching config:", error)
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 })
  }
}

