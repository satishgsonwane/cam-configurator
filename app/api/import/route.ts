import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read the file content
    const fileContent = await file.text()
    
    // Validate JSON format
    try {
      JSON.parse(fileContent)
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 })
    }

    // Get the absolute path to the test/AI_configs directory
    const configDir = path.join(process.cwd(), 'test', 'AI_configs')
    
    // Write both config files
    await writeFile(path.join(configDir, 'config.json'), fileContent)
    await writeFile(path.join(configDir, 'cameraconfig.json'), fileContent)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error importing config:", error)
    return NextResponse.json({ error: "Failed to import configuration" }, { status: 500 })
  }
}

