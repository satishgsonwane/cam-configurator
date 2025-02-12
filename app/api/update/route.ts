import { put, list, del } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { camera, landmark, pan, tilt } = await req.json()

  if (!camera || !landmark || pan === undefined || tilt === undefined) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    // Get existing config from blob storage
    const { blobs } = await list()
    const configBlob = blobs.find(blob => blob.pathname === 'config/config.json')
    
    let config
    if (configBlob) {
      const response = await fetch(configBlob.url)
      config = await response.json()
    } else {
      config = { camera_config: [] }
    }

    // Update the configuration
    const cameraConfig = config.camera_config.find((cam) => cam.camera_id.toString() === camera)
    if (!cameraConfig || !cameraConfig.calibration_data || !cameraConfig.calibration_data[landmark]) {
      return NextResponse.json({ error: "Invalid camera or landmark" }, { status: 400 })
    }

    cameraConfig.calibration_data[landmark] = [pan, tilt]

    // Store updated config in blob storage
    const { url } = await put('config/config.json', JSON.stringify(config, null, 2), {
      access: 'public',
      addRandomSuffix: false, // Keep the same filename
    })

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error("Error updating config:", error)
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 })
  }
}

