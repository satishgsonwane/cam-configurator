import { promises as fs } from "fs"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const file = await fs.readFile(process.cwd() + "/app/data/config.json", "utf8")
    const data = JSON.parse(file)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error reading config file:", error)
    return NextResponse.json({ error: "Failed to read configuration" }, { status: 500 })
  }
}

