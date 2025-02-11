import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function LandmarkSelector({
  config,
  selectedCamera,
  selectedLandmark,
  setSelectedLandmark,
  setPanValue,
  setTiltValue,
}) {
  if (!config || !config.camera_config || !selectedCamera) return null

  const camera = config.camera_config.find((cam) => cam.camera_id.toString() === selectedCamera)
  if (!camera) return null

  const landmarks = camera.calibration_data || {}

  const handleLandmarkChange = (value) => {
    setSelectedLandmark(value)
    const [pan, tilt] = landmarks[value]
    setPanValue(pan.toString())
    setTiltValue(tilt.toString())
  }

  return (
    <div>
      <label className="block mb-2">Select Landmark:</label>
      <Select value={selectedLandmark} onValueChange={handleLandmarkChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a landmark" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(landmarks).map((landmark) => (
            <SelectItem key={landmark} value={landmark}>
              Landmark {landmark}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

