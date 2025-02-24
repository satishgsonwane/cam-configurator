// Remove Vercel blob import
// import { put, list, del } from "@vercel/blob"

// Ensure all operations are local
// Implement local file operations if needed

// Example of local file operation
import { writeFile, readFile } from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"

// export async function POST(req: Request) {
//   // Local file operation logic here
// }

interface CameraConfig {
  camera_id: string;
  name?: string;
  calibration_data: Record<string, [number, number]>;
}

interface Config {
  camera_config: CameraConfig[];
}

export async function POST(req: Request) {
  try {
    const configDir = path.join(process.cwd(), 'test', 'AI_configs')
    const configPath = path.join(configDir, 'config.json')

    // Get the updated field path and value from the request body
    const { path: fieldPath, value } = await req.json()

    // Validate the request body
    if (!fieldPath || value === undefined) {
      return NextResponse.json({ error: "Invalid request body: 'path' and 'value' are required" }, { status: 400 })
    }

    // Read the current config.json
    const configContent = await readFile(configPath, 'utf-8')
    const config: Config = JSON.parse(configContent)

    // Navigate to the correct field using the path
    const keys = fieldPath.split('.')
    let current: any = config
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        return NextResponse.json({ error: `Invalid path: ${keys[i]} not found` }, { status: 400 })
      }
      current = current[keys[i]] as any
    }
    if (!(keys[keys.length - 1] in current)) {
      return NextResponse.json({ error: `Invalid path: ${keys[keys.length - 1]} not found` }, { status: 400 })
    }
    current[keys[keys.length - 1]] = value

    // Write the updated config back to config.json
    try {
      await writeFile(configPath, JSON.stringify(config, null, 2))
      console.log(`Successfully updated ${fieldPath} in config.json`)
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error writing config:", error)
      return NextResponse.json({ error: "Failed to save to config.json", details: (error as Error).message }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in update operation:", error)
    return NextResponse.json({ error: "Failed to update configuration", details: (error as Error).message }, { status: 500 })
  }
}

