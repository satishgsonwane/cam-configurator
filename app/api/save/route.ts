import { NextResponse } from "next/server"
import { writeFile, readFile } from "fs/promises"
import path from "path"

export async function POST(req: Request) {
  try {
    const configDir = path.join(process.cwd(), 'test', 'AI_configs')
    const configPath = path.join(configDir, 'config.json')

    // Log the incoming request body
    const requestBody = await req.text()
    console.log("Received request body:", requestBody)

    // Parse the request body
    const { field, value } = JSON.parse(requestBody)

    // Read the current config.json
    const configContent = await readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)

    // Update the specified field
    config[field] = value

    // Write the updated config back to config.json
    try {
      await writeFile(configPath, JSON.stringify(config, null, 2))
      console.log(`Successfully updated ${field} in config.json`)
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error writing config:", error)
      return NextResponse.json({ error: "Failed to save to config.json", details: (error as Error).message }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in save operation:", error)
    return NextResponse.json({ error: "Failed to save configuration", details: (error as Error).message }, { status: 500 })
  }
} 