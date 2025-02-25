"use client"

import { useState, useEffect, useRef } from "react"
import CameraSelector from "../components/CameraSelector"
import LandmarkSelector from "../components/LandmarkSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Crosshair, Save, Move3D, Download, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"

type CrosshairData = {
  type: "crosshair";
  x: number;
  y: number;
  color: string;
}

type Config = {
  camera_config: CameraConfig[];
}

type CameraConfig = {
  camera_id: string;
  ip?: string;
  name?: string;
  calibration_data?: Record<string, [number, number]>;
}

type ErrorWithMessage = {
  message: string;
}

type EnclosureRequest = {
  action: 'open' | 'close';
  venue: string;
  cameraIPs: string[];
}

const getColorForValue = (value: number) => {
  // Ensure value is between 0 and 10
  const normalizedValue = Math.max(0, Math.min(10, value));
  
  // Return specific colors based on value ranges
  if (normalizedValue <= 5) {
    // Green for 0-5
    return 'rgb(0, 255, 0)';
  } else if (normalizedValue <= 7) {
    // Yellow for 5-7
    return 'orange'
  } else {
    // Red for > 7
    return 'rgb(255, 0, 0)';
  }
};

export default function Home() {
  const [config, setConfig] = useState<Config | null>(null)
  const [selectedCamera, setSelectedCamera] = useState("")
  const [selectedLandmark, setSelectedLandmark] = useState("")
  const [panValue, setPanValue] = useState("")
  const [tiltValue, setTiltValue] = useState("")
  const [zoomValue, setZoomValue] = useState("12000")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [panError, setPanError] = useState("")
  const [tiltError, setTiltError] = useState("")
  const [zoomError, setZoomError] = useState("")

  const [zoom, setZoom] = useState<number>(12000)

  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const [venueNumber, setVenueNumber] = useState("13")

  const [visualizationMode, setVisualizationMode] = useState(false)

  const [enclosureOpen, setEnclosureOpen] = useState(false)

  const [progressValues, setProgressValues] = useState({
    pan1: 0,
    pan2: 0,
    tilt1: 0,
    tilt2: 0
  });
  const [landmarkPtValues, setLandmarkPtValues] = useState<Record<string, { pan: number; tilt: number }>>({});
  const [selectedVerificationLandmark, setSelectedVerificationLandmark] = useState("");
  const [verificationPanValue, setVerificationPanValue] = useState("");
  const [verificationTiltValue, setVerificationTiltValue] = useState("");

  const validateVenue = (value: string) => {
    const venue = Number(value)
    if (isNaN(venue) || venue < 1) {
      toast.error("Venue number must be a positive number")
      return false
    }
    return true
  }

  const handleTestCalibration = async () => {
    if (!selectedCamera) {
      toast.error("Please select a camera first")
      return
    }

    try {
      const response = await fetch("/api/test-calibration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedCamera }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to test calibration")
      }

      // Ensure the object matches the expected shape
      setProgressValues({
        pan1: data.PAN_STD_1,
        pan2: data.PAN_STD_2,
        tilt1: data.TILT_STD_1,
        tilt2: data.TILT_STD_2
      })

      toast.success("Calibration test completed")
    } catch (error) {
      console.error("Error testing calibration:", error)
      toast.error(error instanceof Error ? error.message : "Failed to test calibration")
    }
  }

  const handleTestLandmarkPt = async () => {
    if (!selectedCamera) {
      toast.error("Please select a camera first")
      return
    }

    try {
      const response = await fetch("/api/test-landmark-pt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedCamera }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to test landmark PT")
      }

      setLandmarkPtValues(data)
      toast.success("Landmark PT test completed")
    } catch (error) {
      console.error("Error testing landmark PT:", error)
      toast.error(error instanceof Error ? error.message : "Failed to test landmark PT")
    }
  }

  const handleVerificationLandmarkChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const landmark = event.target.value
    setSelectedVerificationLandmark(landmark)
    if (landmark && landmarkPtValues[landmark]) {
      setVerificationPanValue(landmarkPtValues[landmark].pan.toString())
      setVerificationTiltValue(landmarkPtValues[landmark].tilt.toString())
    } else {
      setVerificationPanValue("")
      setVerificationTiltValue("")
    }
  }

  const handleCheckPosition = async () => {
    if (!selectedCamera || !selectedVerificationLandmark) {
      toast.error("Please select a camera and landmark first")
      return
    }

    const message = {
      pansetpoint: Number(verificationPanValue),
      tiltsetpoint: Number(verificationTiltValue),
      zoomsetpoint: Number(zoomValue),
    }

    try {
      const response = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          camera: selectedCamera, 
          message,
          venue: venueNumber 
        }),
      })
      if (!response.ok) throw new Error("Failed to send move command")
      toast.success("Move command sent successfully")
    } catch (error) {
      console.error("Error sending move command:", error)
      toast.error("Failed to send move command")
    }
  }

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config")
        if (!response.ok) throw new Error("Failed to fetch configuration")
        const data = await response.json()
        setConfig(data)
        
        // If there's a selected camera and landmark, load their values
        if (selectedCamera && selectedLandmark && data?.camera_config) {
          const camera = data.camera_config.find(
            (cam: CameraConfig) => cam.camera_id.toString() === selectedCamera
          )
          if (camera?.calibration_data?.[selectedLandmark]) {
            const [pan, tilt] = camera.calibration_data[selectedLandmark]
            setPanValue(pan.toString())
            setTiltValue(tilt.toString())
          }
        }
      } catch (error) {
        const err = error as ErrorWithMessage
        console.error("Error fetching config:", err)
        toast.error(err.message || "Failed to fetch configuration")
      }
    }

    fetchConfig()
  }, [selectedCamera, selectedLandmark]) // Re-fetch when camera or landmark changes

  useEffect(() => {
    return () => {
      // Cleanup visualization when component unmounts
      if (visualizationMode) {
        handleVisualization(false)
      }
    }
  }, []) // Empty dependency array for unmount only

  const validatePan = (value: string) => {
    const pan = Number(value)
    if (isNaN(pan) || pan < -55 || pan > 55) {
      setPanError("PAN must be between -55 and 55")
      return false
    }
    setPanError("")
    return true
  }

  const validateTilt = (value: string) => {
    const tilt = Number(value)
    if (isNaN(tilt) || tilt < -20 || tilt > 20) {
      setTiltError("TILT must be between -20 and 20")
      return false
    }
    setTiltError("")
    return true
  }

  const validateZoom = (value: string) => {
    const zoom = Number(value)
    if (isNaN(zoom) || zoom < 0 || zoom > 16000) {
      setZoomError("ZOOM must be between 0 and 16000")
      return false
    }
    setZoomError("")
    return true
  }

  const handleMove = async () => {
    if (!selectedCamera || !selectedLandmark) return

    if (!validatePan(panValue) || !validateTilt(tiltValue) || !validateZoom(zoomValue) || !validateVenue(venueNumber)) {
      return
    }

    const message = {
      pansetpoint: Number(panValue),
      tiltsetpoint: Number(tiltValue),
      zoomsetpoint: Number(zoomValue),
    }

    try {
      const response = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          camera: selectedCamera, 
          message,
          venue: venueNumber 
        }),
      })
      if (!response.ok) throw new Error("Failed to send move command")
      toast.success("Move command sent successfully")
    } catch (error) {
      console.error("Error sending move command:", error)
      toast.error("Failed to send move command")
    }
  }

  const handleUpdate = async () => {
    if (!selectedCamera || !selectedLandmark) return

    if (!validatePan(panValue) || !validateTilt(tiltValue)) {
      return
    }

    setSaveStatus("loading")
    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera: selectedCamera,
          landmark: selectedLandmark,
          pan: Number(panValue),
          tilt: Number(tiltValue),
        }),
      })

      if (!response.ok) throw new Error("Failed to update configuration")
      
      const data = await response.json()
      if (data.success) {
        // Fetch fresh configuration with cache-busting
        const updatedConfig = await fetch(`/api/config?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }).then((res) => res.json())
        
        setConfig(updatedConfig)
        toast.success("Configuration updated successfully")
        setSaveStatus("success")
      } else {
        throw new Error(data.error || "Failed to update configuration")
      }
    } catch (error) {
      console.error("Error updating configuration:", error)
      const err = error as ErrorWithMessage
      toast.error(err.message || "Failed to update configuration")
      setSaveStatus("error")
    } finally {
      setTimeout(() => {
        setSaveStatus("idle")
      }, 2000)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    if (!fileInputRef.current?.files) return
    const file = fileInputRef.current.files[0]
    if (!file) {
      toast.error("Please select a file to import")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to import configuration")

      toast.success("Configuration imported successfully")
      // Refresh the configuration
      const updatedConfig = await fetch("/api/config").then((res) => res.json())
      setConfig(updatedConfig)
    } catch (error) {
      console.error("Error importing configuration:", error)
      toast.error("Failed to import configuration")
    }
  }

  const handleReset = async () => {
    if (!selectedCamera || !validateVenue(venueNumber)) return

    // Update the input fields
    setPanValue("0")
    setTiltValue("0")
    setZoomValue("0")

    const message = {
      pansetpoint: 0,
      tiltsetpoint: 0,
      zoomsetpoint: 0,
    }

    try {
      const response = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          camera: selectedCamera, 
          message,
          venue: venueNumber 
        }),
      })
      if (!response.ok) throw new Error("Failed to send reset command")
      toast.success("Reset command sent successfully")
    } catch (error) {
      console.error("Error sending reset command:", error)
      toast.error("Failed to send reset command")
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch("/api/download") // Updated endpoint to match the route
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to download configuration")
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : 'camera_calibration.json'
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Create temporary link and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = filename // Use filename from server
      link.style.display = 'none' // Hide the link
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success("Configuration downloaded successfully")
    } catch (error) {
      console.error("Error downloading configuration:", error)
      toast.error(error instanceof Error ? error.message : "Failed to download configuration")
    }
  }

  const handleVisualization = async (enabled: boolean) => {
    if (!config?.camera_config || !validateVenue(venueNumber)) {
      toast.error("Please import config and set valid venue first")
      setVisualizationMode(false)
      return
    }

    try {
      // Create eventData for all cameras
      const eventData: Record<string, CrosshairData[]> = {}
      config.camera_config.forEach((camera: CameraConfig) => {
        eventData[`/camera${camera.camera_id}`] = enabled ? [
          {
            type: "crosshair",
            x: 0.5,
            y: 0.5,
            color: "FF0000"
          }
        ] : []
      })

      const response = await fetch(`https://isproxy.ozapi.net/venue${venueNumber}/engine/lut/nats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventName: "annotationgraphicspercamera",
          eventData
        })
      })

      if (!response.ok) {
        throw new Error("Failed to update visualization")
      }

      toast.success(enabled ? "Visualization enabled for all cameras" : "Visualization disabled for all cameras")
    } catch (error) {
      console.error("Error toggling visualization:", error)
      toast.error("Failed to toggle visualization")
      setVisualizationMode(false)
    }
  }

  const handleEnclosure = async (open: boolean) => {
    if (!config?.camera_config || !validateVenue(venueNumber)) {
      toast.error("Please import config and set valid venue first")
      setEnclosureOpen(false)
      return
    }

    try {
      // Map camera IDs to the correct IP range (41-46)
      const cameraIPs = config.camera_config
        .map((camera: CameraConfig) => {
          const cameraNumber = parseInt(camera.camera_id)
          if (isNaN(cameraNumber)) return null
          return `192.168.${54+ +venueNumber}.${40 + cameraNumber}` // Maps camera 1 to .41, 2 to .42, etc.
        })
        .filter((ip: string | null): ip is string => Boolean(ip))

      if (cameraIPs.length === 0) {
        throw new Error("No valid camera IPs found in config")
      }

      const response = await fetch("/api/enclosure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: open ? 'open' : 'close',
          venue: venueNumber,
          cameraIPs
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${open ? 'open' : 'close'} enclosures`)
      }

      toast.success(`All enclosures ${open ? 'opened' : 'closed'} successfully`)
    } catch (error) {
      const err = error as ErrorWithMessage
      console.error("Error controlling enclosures:", err)
      toast.error(err.message || `Failed to ${open ? 'open' : 'close'} enclosures`)
      setEnclosureOpen(!open) // Revert switch state on error
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="z-10 w-full space-y-2">
        <Card>
          <CardContent className="flex justify-between p-4 gap-4">
            <div className="flex gap-4">
              <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImport} />
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="gap-2 bg-blue-100 hover:bg-blue-200 text-blue-600 border-blue-300 hover:border-blue-400 transition-colors font-semibold"
                    >
                      <Upload className="h-4 w-4 text-blue-600" />
                      Import Config
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Import config json to check and edit</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="visualization-mode"
                        checked={visualizationMode}
                        onCheckedChange={(checked) => {
                          setVisualizationMode(checked)
                          handleVisualization(checked)
                        }}
                      />
                      <Label htmlFor="visualization-mode" className="text-sm font-medium cursor-help">
                        Visualization
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle visualization mode</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="text-center flex-grow">
              <h1 className="text-2xl font-bold text-gray-900">Camera Calibration Utility</h1>
              <h2 className="text-sm font-bold text-red-500">Start by importing relevant config first!</h2>
            </div>

            <div className="flex gap-4">
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div>
                      <ConfirmDialog
                        title="Download Configuration"
                        description={
                          <div>
                            <h4 className="font-bold">Download the current configuration?</h4>
                            <br/>
                            <p>This will download the current state of the configuration as a JSON file.</p>
                          </div>
                        }
                        onConfirm={handleDownload}
                        onCancel={() => {}}
                        triggerText="Download Config"
                        triggerClassName="gap-2 bg-green-100 hover:bg-green-200 text-green-600 border-green-300 hover:border-green-400 transition-colors font-semibold"
                        triggerIcon={<Download className="h-4 w-4 text-green-600" />}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download current configuration as JSON</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <ConfirmDialog
                title="Save Configuration"
                description={<div>
                  <h4 className="font-bold">Are you sure you want to save the configuration?</h4>
                  <br/>
                  <p>Camera: {selectedCamera}</p>
                  <p>Landmark: {selectedLandmark}</p>
                  <p>Pan: {panValue}</p>
                  <p>Tilt: {tiltValue}</p>
                </div>}
                onConfirm={handleUpdate}
                onCancel={() => {}}
                triggerText={saveStatus === "loading" ? "Saving..." : 
                 saveStatus === "success" ? "Saved!" :
                 saveStatus === "error" ? "Error!" : "Save Configuration"}
                triggerClassName="gap-2 bg-gray-900 hover:bg-red-800 text-white border-gray-800 hover:border-red-700 transition-colors font-semibold"
                triggerIcon={<Save className="h-4 w-4 text-white" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area - Grid Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Field Visualization */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Field Visualization</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-4">
                <div className="relative w-full h-[500px]">
                  <Image
                    src="/field.png"
                    alt="Football field layout"
                    fill
                    className="object-contain rotate-0 scale-[1] transform-gpu"
                    priority
                  />
                </div>
              </CardContent>
            </Card>

            {/* Test Calibration Section */}
            <Card>
              <CardContent className="space-y-6 p-6">
                <Button 
                  onClick={handleTestCalibration}
                  className="w-full bg-yellow-400 hover:bg-yellow-600 text-black text-xl hover:text-white"
                >
                  Validate Calibration
                </Button>

                <div className="flex justify-around space-x-4">
                  <div className="flex flex-col items-center space-y-2">
                    <Label>Pan_STD_1</Label>
                    <div 
                      className="w-8 h-32 bg-gray-200 rounded-md overflow-hidden flex items-end"
                    >
                      <div 
                        className="w-full rounded-md"
                        style={{
                          height: `${(progressValues.pan1 / 20) * 100}%`, // Adjust height based on 0-20 range
                          backgroundColor: getColorForValue(progressValues.pan1)
                        }}
                      />
                    </div>
                    <span className="text-sm">{Number(progressValues.pan1).toFixed(3)}</span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <Label>Pan_STD_2</Label>
                    <div 
                      className="w-8 h-32 bg-gray-200 rounded-md overflow-hidden flex items-end"
                    >
                      <div 
                        className="w-full rounded-md"
                        style={{
                          height: `${(progressValues.pan2 / 20) * 100}%`, // Adjust height based on 0-20 range
                          backgroundColor: getColorForValue(progressValues.pan2)
                        }}
                      />
                    </div>
                    <span className="text-sm">{Number(progressValues.pan2).toFixed(3)}</span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <Label>Tilt_STD_1</Label>
                    <div 
                      className="w-8 h-32 bg-gray-200 rounded-md overflow-hidden flex items-end"
                    >
                      <div 
                        className="w-full rounded-md"
                        style={{
                          height: `${(progressValues.tilt1 / 20) * 100}%`, // Adjust height based on 0-20 range
                          backgroundColor: getColorForValue(progressValues.tilt1)
                        }}
                      />
                    </div>
                    <span className="text-sm">{Number(progressValues.tilt1).toFixed(3)}</span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <Label>Tilt_STD_2</Label>
                    <div 
                      className="w-8 h-32 bg-gray-200 rounded-md overflow-hidden flex items-end"
                    >
                      <div 
                        className="w-full rounded-md"
                        style={{
                          height: `${(progressValues.tilt2 / 20) * 100}%`, // Adjust height based on 0-20 range
                          backgroundColor: getColorForValue(progressValues.tilt2)
                        }}
                      />
                    </div>
                    <span className="text-sm">{Number(progressValues.tilt2).toFixed(3)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Camera Controls */}
          <div className="space-y-6">
            {/* Camera Selection Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pr-6">
                <CardTitle>Camera Selection</CardTitle>
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          const newState = !enclosureOpen;
                          setEnclosureOpen(newState);
                          handleEnclosure(newState);
                        }}
                        variant="outline"
                        className={`gap-2 transition-colors font-semibold ${
                          enclosureOpen 
                            ? "bg-red-100 hover:bg-red-200 text-red-600 border-red-300 hover:border-red-400" 
                            : "bg-green-100 hover:bg-green-200 text-green-600 border-green-300 hover:border-green-400"
                        }`}
                      >
                        {enclosureOpen ? (
                          <>
                            <Lock className="h-4 w-4" />
                            Close Enclosures
                          </>
                        ) : (
                          <>
                            <Unlock className="h-4 w-4" />
                            Open Enclosures
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{enclosureOpen ? 'Close all camera enclosures' : 'Open all camera enclosures'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Label className="text-sm font-medium cursor-help">Venue Number</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter the venue number for camera control (e.g., 13)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    type="number"
                    value={venueNumber}
                    onChange={(e) => setVenueNumber(e.target.value)}
                    placeholder="Enter venue number"
                    className="w-full"
                  />
                </div>
                
                <CameraSelector
                  config={config as any}
                  selectedCamera={selectedCamera}
                  setSelectedCamera={setSelectedCamera}
                  setSelectedLandmark={setSelectedLandmark}
                  setProgressValues={setProgressValues}
                  setLandmarkPtValues={setLandmarkPtValues}
                  setSelectedVerificationLandmark={setSelectedVerificationLandmark}
                  setVerificationPanValue={setVerificationPanValue}
                  setVerificationTiltValue={setVerificationTiltValue}
                />
                <LandmarkSelector
                  config={config as any}
                  selectedCamera={selectedCamera}
                  selectedLandmark={selectedLandmark}
                  setSelectedLandmark={setSelectedLandmark}
                  setPanValue={setPanValue}
                  setTiltValue={setTiltValue}
                />
              </CardContent>
            </Card>

            {/* Camera Controls Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pr-6">
                <CardTitle className="text-lg">Position Controls</CardTitle>
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={handleReset} 
                        variant="outline"
                        className="bg-purple-100 hover:bg-purple-200 text-purple-600 border-purple-300 hover:border-purple-400 transition-colors font-semibold"
                      >
                        <Crosshair className="h-4 w-4 mr-2 text-purple-600" />
                        Recenter
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Move cameras to Pan: Zero, Tilt: Zero and Zoom: Zero</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pan (°)</Label>
                    <Input
                      type="number"
                      value={panValue}
                      onChange={(e) => {
                        setPanValue(e.target.value)
                        validatePan(e.target.value)
                      }}
                    />
                    {panError && <Alert variant="destructive" className="text-xs p-2">{panError}</Alert>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tilt (°)</Label>
                    <Input
                      type="number"
                      value={tiltValue}
                      onChange={(e) => {
                        setTiltValue(e.target.value)
                        validateTilt(e.target.value)
                      }}
                    />
                    {tiltError && <Alert variant="destructive" className="text-xs p-2">{tiltError}</Alert>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Zoom Level</Label>
                  <Input
                    type="number"
                    value={zoomValue}
                    onChange={(e) => {
                      setZoomValue(e.target.value)
                      validateZoom(e.target.value)
                    }}
                  />
                  {zoomError && <Alert variant="destructive" className="text-xs p-2">{zoomError}</Alert>}
                </div>

                <Button 
                  onClick={handleMove} 
                  className="w-full bg-blue-700 text-white hover:bg-blue-500 h-12 text-lg hover:text-black"
                >
                  <Move3D className="h-5 w-5 mr-2" />
                  Take me there!
                </Button>
              </CardContent>
            </Card>

            {/* Calibration Verification Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pr-6">
                <CardTitle className="text-lg">Calibration Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleTestLandmarkPt}
                  className="w-full bg-green-500 hover:bg-green-700 text-black hover:text-white"
                >
                  Calculate Landmark PT
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="verification-landmark">Landmark</Label>
                  <select
                    id="verification-landmark"
                    value={selectedVerificationLandmark}
                    onChange={handleVerificationLandmarkChange}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select Landmark</option>
                    {Object.keys(landmarkPtValues).map((landmark) => (
                      <option key={landmark} value={landmark}>
                        Position {landmark}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pan (°)</Label>
                    <Input
                      type="number"
                      value={verificationPanValue}
                      readOnly
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tilt (°)</Label>
                    <Input
                      type="number"
                      value={verificationTiltValue}
                      readOnly
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCheckPosition}
                  className="w-full bg-green-500 hover:bg-green-700 text-black hover:text-white"
                >
                  Check Position
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
    