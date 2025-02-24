import { promises as fs } from "fs"
import { NextResponse } from "next/server"

type CalibrationRequest = {
  camera: string
  landmark: string
  pan: number
  tilt: number
}

type CameraConfig = {
  camera_id: number
  calibration_data: {
    [key: string]: [number, number]
  }
  [key: string]: any
}

type ConfigFile = {
  camera_config: CameraConfig[]
  [key: string]: any
}

export async function POST(req: Request) {
  try {
    const { camera, landmark, pan, tilt }: CalibrationRequest = await req.json()

    // Validate required parameters
    if (!camera || !landmark || pan === undefined || tilt === undefined) {
      return NextResponse.json(
        { error: "Missing required parameters" }, 
        { status: 400 }
      )
    }

    // Read and parse config file
    const file = await fs.readFile(
      process.cwd() + "/test/AI_configs/config_modified.json", 
      "utf8"
    )
    const config: ConfigFile = JSON.parse(file)

    // Find camera config
    const cameraConfig = config.camera_config.find(
      (cam) => cam.camera_id.toString() === camera
    )

    // Validate camera and calibration data
    if (!cameraConfig?.calibration_data?.[landmark]) {
      return NextResponse.json(
        { error: "Invalid camera or landmark" }, 
        { status: 400 }
      )
    }

    // Update calibration data
    cameraConfig.calibration_data[landmark] = [pan, tilt]

    // Write updated config back to file
    await fs.writeFile(
      process.cwd() + "/test/AI_configs/config_modified.json",
      JSON.stringify(config, null, 2)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating config file:", error)
    return NextResponse.json(
      { error: "Failed to update configuration" }, 
      { status: 500 }
    )
  }
}