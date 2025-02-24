import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'test', 'AI_configs', 'config.json')
    
    try {
      const configContent = await readFile(configPath, 'utf-8')
      const config = JSON.parse(configContent)
      return NextResponse.json(config)
    } catch (error) {
      // Return default config if file doesn't exist or is invalid
      return NextResponse.json({ camera_config: [] })
    }
  } catch (error) {
    console.error("Error fetching config:", error)
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 })
  }
}

