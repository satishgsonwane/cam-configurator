import { NextResponse } from "next/server"
import { connect, StringCodec } from "nats"

export async function POST(req: Request) {
  const { camera, message } = await req.json()

  if (!camera || !message) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    // Connect to the venue's NATS server
    const nc = await connect({ 
      servers: process.env.NEXT_PUBLIC_NATS_SERVER,
      timeout: 5000 // 5 second timeout
    })
    const sc = StringCodec()
    
    // Match the topics used in the Flask app
    const colourTopic = `colour-control.camera${camera}`
    const ptzTopic = `ptzcontrol.camera${camera}`
    
    // Send the message multiple times as done in Flask app
    const maxMessages = 5 // Matches Flask's default MAX_MESSAGES
    for (let i = 0; i < maxMessages; i++) {
      await nc.publish(colourTopic, sc.encode(JSON.stringify(message)))
      await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay between messages
    }

    // Send inquiry message
    await nc.publish(ptzTopic, sc.encode(JSON.stringify({ "inqcam": camera })))
    
    await nc.close()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending NATS message:", error)
    return NextResponse.json({ error: "Failed to send NATS message" }, { status: 500 })
  }
}

