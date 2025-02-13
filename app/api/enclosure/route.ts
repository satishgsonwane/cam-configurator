import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { action, venue, cameraIPs } = await req.json()

  if (!action || !venue || !cameraIPs) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://isproxy.ozapi.net/venue${venue}/engine/enclosure/${action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(cameraIPs)
      }
    )

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error controlling enclosure:", error)
    return NextResponse.json({ error: "Failed to control enclosure" }, { status: 500 })
  }
} 