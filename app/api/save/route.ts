import { NextResponse } from "next/server"
import { writeFile, readFile } from "fs/promises"
import path from "path"

export async function POST(req: Request) {
  try {
    const configDir = path.join(process.cwd(), 'test', 'AI_configs')
    const configPath = path.join(configDir, 'config.json')
    const cameraConfigPath = path.join(configDir, 'cameraconfig.json')

    // Read the current config.json
    const configContent = await readFile(configPath, 'utf-8')
    
    // Write to both files
    await writeFile(configPath, configContent)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving config:", error)
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 })
  }
} 