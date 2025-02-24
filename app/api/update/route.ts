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

    // Get the updated field and value from the request body
    const { field, value } = await req.json()

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
    console.error("Error in update operation:", error)
    return NextResponse.json({ error: "Failed to update configuration", details: (error as Error).message }, { status: 500 })
  }
}

