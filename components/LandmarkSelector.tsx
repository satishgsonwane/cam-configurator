import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Props {
  config: { camera_config: Array<{ camera_id: string; calibration_data: Record<string, [number, number]> }> } | null;
  selectedCamera: string;
  selectedLandmark: string;
  setSelectedLandmark: (landmark: string) => void;
  setPanValue: (value: string) => void;
  setTiltValue: (value: string) => void;
}

export default function LandmarkSelector({
  config,
  selectedCamera,
  selectedLandmark,
  setSelectedLandmark,
  setPanValue,
  setTiltValue,
}: Props) {
  const handleLandmarkChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const landmark = event.target.value
    setSelectedLandmark(landmark)

    // Get the saved pan/tilt values for this landmark
    if (landmark && selectedCamera && config) {
      const camera = config.camera_config.find(
        (cam) => cam.camera_id.toString() === selectedCamera
      )
      if (camera?.calibration_data?.[landmark]) {
        const [pan, tilt] = camera.calibration_data[landmark]
        setPanValue(pan.toString())
        setTiltValue(tilt.toString())
      }
    }
  }

  // Get available landmarks for selected camera
  const landmarks = selectedCamera && config
    ? Object.keys(
        config.camera_config.find(
          (cam) => cam.camera_id.toString() === selectedCamera
        )?.calibration_data || {}
      )
    : []

  return (
    <div className="space-y-2">
      <Label htmlFor="landmark">Landmark</Label>
      <select
        id="landmark"
        value={selectedLandmark}
        onChange={handleLandmarkChange}
        className="w-full p-2 border rounded-md"
        disabled={!selectedCamera}
      >
        <option value="">Select Landmark</option>
        {landmarks.map((landmark) => (
          <option key={landmark} value={landmark}>
            Position {landmark}
          </option>
        ))}
      </select>
    </div>
  )
}

