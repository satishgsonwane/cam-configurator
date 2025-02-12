import { Label } from "@/components/ui/label"

interface CameraConfig {
  camera_id: string;
  name?: string;
  calibration_data: Record<string, [number, number]>;
}

interface Props {
  config: { camera_config: CameraConfig[] } | null;
  selectedCamera: string;
  setSelectedCamera: (camera: string) => void;
  setSelectedLandmark: (landmark: string) => void;
}

export default function CameraSelector({ config, selectedCamera, setSelectedCamera, setSelectedLandmark }: Props) {
  const handleCameraChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(event.target.value)
    setSelectedLandmark("") // Reset landmark when camera changes
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="camera">Camera</Label>
      <select
        id="camera"
        value={selectedCamera}
        onChange={handleCameraChange}
        className="w-full p-2 border rounded-md"
      >
        <option value="">Select Camera</option>
        {config?.camera_config.map((camera) => (
          <option key={camera.camera_id} value={camera.camera_id}>
            {camera.name || `Camera ${camera.camera_id}`}
          </option>
        ))}
      </select>
    </div>
  )
}

