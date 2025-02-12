import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

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

    // Store in blob storage
    const { url } = await put('config/config.json', fileContent, {
      access: 'public',
      addRandomSuffix: false,
    })

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error("Error importing config:", error)
    return NextResponse.json({ error: "Failed to import configuration" }, { status: 500 })
  }
}

