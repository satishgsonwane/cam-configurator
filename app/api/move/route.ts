import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { camera, message, venue } = await req.json()

  if (!camera || !message || !venue) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/json")

    // Construct the event name using the camera number
    const eventName = `ptzcontrol.camera${camera}`

    // Prepare the request body
    const raw = JSON.stringify({
      eventName,
      eventData: {
        pansetpoint: message.pansetpoint,
        tiltsetpoint: message.tiltsetpoint,
        zoomsetpoint: message.zoomsetpoint
      }
    })

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow" as RequestRedirect
    }

    // Use the venue number in the API URL
    const response = await fetch(`https://isproxy.ozapi.net/venue${venue}/engine/lut/nats`, requestOptions)
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const result = await response.text()
    console.log("API Response:", result)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

