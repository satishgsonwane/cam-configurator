import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CameraSelector({ config, selectedCamera, setSelectedCamera, setSelectedLandmark }) {
  if (!config || !config.camera_config) return null

  const handleCameraChange = (value) => {
    setSelectedCamera(value)
    setSelectedLandmark("")
  }

  return (
    <div>
      <label className="block mb-2">Select Camera:</label>
      <Select value={selectedCamera} onValueChange={handleCameraChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a camera" />
        </SelectTrigger>
        <SelectContent>
          {config.camera_config.map((camera) => (
            <SelectItem key={camera.camera_id} value={camera.camera_id.toString()}>
              Camera {camera.camera_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

