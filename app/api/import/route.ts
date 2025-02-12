import { NextResponse } from "next/server"
import { promises as fs } from "fs"

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const content = buffer.toString()

  try {
    // Parse the uploaded JSON to validate it
    JSON.parse(content)

    // Write to imported.json instead of config.json
    await fs.writeFile(process.cwd() + "/app/data/config.json", content)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error importing configuration:", error)
    return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 })
  }
}

