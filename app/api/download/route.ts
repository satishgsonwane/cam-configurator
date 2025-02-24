import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

export async function GET() {
  try {
    // Get the absolute path to config.json
    const configPath = path.join(process.cwd(), 'test', 'AI_configs', 'config.json')
    
    // Read the config file
    const configContent = await readFile(configPath, 'utf-8')
    
    // Generate timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    // Create response with the file content
    const response = new NextResponse(configContent)
    
    // Set headers for file download
    response.headers.set('Content-Type', 'application/json')
    response.headers.set('Content-Disposition', `attachment; filename="config_modified_${timestamp}.json"`)
    
    return response
  } catch (error) {
    console.error("Error downloading config:", error)
    return NextResponse.json({ error: "Failed to download configuration" }, { status: 500 })
  }
} 