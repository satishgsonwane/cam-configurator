import { promises as fs } from "fs"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { camera, landmark, pan, tilt } = await req.json()

  if (!camera || !landmark || pan === undefined || tilt === undefined) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const file = await fs.readFile(process.cwd() + "/app/data/config.json", "utf8")
    const config = JSON.parse(file)

    const cameraConfig = config.camera_config.find((cam) => cam.camera_id.toString() === camera)
    if (!cameraConfig || !cameraConfig.calibration_data || !cameraConfig.calibration_data[landmark]) {
      return NextResponse.json({ error: "Invalid camera or landmark" }, { status: 400 })
    }

    cameraConfig.calibration_data[landmark] = [pan, tilt]

    await fs.writeFile(process.cwd() + "/app/data/config.json", JSON.stringify(config, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating config file:", error)
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 })
  }
}

