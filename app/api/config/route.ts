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

    const response = await fetch(configBlob.url)
    const config = await response.json()
    
    return NextResponse.json(config)
  } catch (error) {
    console.error("Error fetching config:", error)
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 })
  }
}

