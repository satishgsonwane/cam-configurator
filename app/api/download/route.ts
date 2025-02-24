// app/api/download-config/route.ts
import { NextResponse } from "next/server"
import { promises as fs } from "fs"

type ConfigFile = {
  camera_config: {
    camera_id: number
    calibration_data: {
      [key: string]: [number, number]
    }
    [key: string]: any
  }[]
  [key: string]: any
}

export async function GET() {
  try {
    // Read the config file
    const configContent = await fs.readFile(
      process.cwd() + "/test/AI_configs/config_modified.json",
      "utf8"
    )

    // Parse to validate JSON structure
    const config: ConfigFile = JSON.parse(configContent)

    // Generate timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `camera_calibration_${timestamp}.json`

    // Create response with the file content
    const response = new NextResponse(configContent)

    // Set headers for file download
    response.headers.set('Content-Type', 'application/json')
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    )

    return response
  } catch (error) {
    console.error("Error downloading config:", error)
    return NextResponse.json(
      { error: "Failed to download configuration" },
      { status: 500 }
    )
  }
}