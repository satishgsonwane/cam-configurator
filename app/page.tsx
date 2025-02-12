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
import { Upload, Crosshair, Save, Move3D } from "lucide-react"
import { toast } from "sonner"

export default function Home() {
  const [config, setConfig] = useState(null)
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

  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then((data) => setConfig(data))
  }, [])

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

    if (!validatePan(panValue) || !validateTilt(tiltValue) || !validateZoom(zoomValue)) {
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
        body: JSON.stringify({ camera: selectedCamera, message }),
      })
      if (!response.ok) throw new Error("Failed to send NATS message")
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

    // Add confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to update the configuration?\n\nCamera: ${selectedCamera}\nLandmark: ${selectedLandmark}\nPan: ${panValue}\nTilt: ${tiltValue}`
    )

    if (!confirmed) return

    try {
      const response = await fetch("/api/update", {
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
      toast.success("Configuration updated successfully")
      // Refresh the configuration
      const updatedConfig = await fetch("/api/config").then((res) => res.json())
      setConfig(updatedConfig)
    } catch (error) {
      console.error("Error updating configuration:", error)
      toast.error("Failed to update configuration")
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
    if (!selectedCamera) return

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
        body: JSON.stringify({ camera: selectedCamera, message }),
      })
      if (!response.ok) throw new Error("Failed to send reset command")
      toast.success("Reset command sent successfully")
    } catch (error) {
      console.error("Error sending reset command:", error)
      toast.error("Failed to send reset command")
    }
  }

  const handleSaveConfig = async () => {
    setSaveStatus("loading")
    try {
      const response = await fetch("/api/format", {
        method: "POST"
      })
      
      if (!response.ok) throw new Error("Save failed")
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Save error:", error)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="z-10 w-full max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold text-gray-900 text-center">Camera Calibration Utility</h1>
        
        {/* Action Buttons Card */}
        <Card>
          <CardContent className="flex justify-between p-4 gap-4">
            <div className="flex gap-4">
              <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImport} />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="gap-2 bg-blue-100 hover:bg-blue-200 text-blue-600 border-blue-300 hover:border-blue-400 transition-colors font-semibold"
              >
                <Upload className="h-4 w-4 text-blue-600" />
                Import Config
              </Button>
              <Button 
                onClick={handleReset} 
                variant="outline"
                className="bg-purple-100 hover:bg-purple-200 text-purple-600 border-purple-300 hover:border-purple-400 transition-colors font-semibold"
              >
                <Crosshair className="h-4 w-4 mr-2 text-purple-600" />
                Recenter
              </Button>
            </div>
            <Button 
              onClick={handleSaveConfig}
              disabled={saveStatus === "loading"}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveStatus === "loading" ? "Saving..." : 
               saveStatus === "success" ? "Saved!" :
               saveStatus === "error" ? "Error!" : "Save Configuration"}
            </Button>
          </CardContent>
        </Card>

        {/* Camera Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Camera Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <CameraSelector
                config={config}
                selectedCamera={selectedCamera}
                setSelectedCamera={setSelectedCamera}
                setSelectedLandmark={setSelectedLandmark}
              />
              <LandmarkSelector
                config={config}
                selectedCamera={selectedCamera}
                selectedLandmark={selectedLandmark}
                setSelectedLandmark={setSelectedLandmark}
                setPanValue={setPanValue}
                setTiltValue={setTiltValue}
              />
            </CardContent>
          </Card>

          {/* Position Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position Controls</CardTitle>
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
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
              >
                <Move3D className="h-5 w-5 mr-2" />
                Boom ! Bam!
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Field Visualization */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Field Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video rounded-lg overflow-hidden border">
              <Image
                src="/field.png"
                alt="Football field layout"
                fill
                className="object-cover"
                priority
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

