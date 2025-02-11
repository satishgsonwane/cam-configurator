"use client"

import { useState, useEffect, useRef } from "react"
import CameraSelector from "../components/CameraSelector"
import LandmarkSelector from "../components/LandmarkSelector"
import IPAddressInput from "../components/IPAddressInput"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useCameraStatus } from '@/hooks/use-camera-status'

export default function Home() {
  const [config, setConfig] = useState(null)
  const [selectedCamera, setSelectedCamera] = useState("")
  const [selectedLandmark, setSelectedLandmark] = useState("")
  const [panValue, setPanValue] = useState("")
  const [tiltValue, setTiltValue] = useState("")
  const [zoomValue, setZoomValue] = useState("12000")
  const [ipAddress, setIpAddress] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [panError, setPanError] = useState("")
  const [tiltError, setTiltError] = useState("")
  const [zoomError, setZoomError] = useState("")

  const cameraStatus = useCameraStatus()

  const [zoom, setZoom] = useState<number>(12000)

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
        body: JSON.stringify({ camera: selectedCamera, message, ipAddress }),
      })
      if (!response.ok) throw new Error("Failed to send NATS message")
      alert("Move command sent successfully")
    } catch (error) {
      console.error("Error sending move command:", error)
      alert("Failed to send move command")
    }
  }

  const handleUpdate = async () => {
    if (!selectedCamera || !selectedLandmark) return

    if (!validatePan(panValue) || !validateTilt(tiltValue)) {
      return
    }

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
      alert("Configuration updated successfully")
      // Refresh the configuration
      const updatedConfig = await fetch("/api/config").then((res) => res.json())
      setConfig(updatedConfig)
    } catch (error) {
      console.error("Error updating configuration:", error)
      alert("Failed to update configuration")
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    if (!fileInputRef.current?.files) return
    const file = fileInputRef.current.files[0]
    if (!file) {
      alert("Please select a file to import")
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

      alert("Configuration imported successfully")
      // Refresh the configuration
      const updatedConfig = await fetch("/api/config").then((res) => res.json())
      setConfig(updatedConfig)
    } catch (error) {
      console.error("Error importing configuration:", error)
      alert("Failed to import configuration")
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Camera Configuration Utility</h1>
        <IPAddressInput ipAddress={ipAddress} setIpAddress={setIpAddress} />
        <div className="mb-4">
          <CameraSelector
            config={config}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            setSelectedLandmark={setSelectedLandmark}
          />
        </div>
        <div className="mb-4">
          <LandmarkSelector
            config={config}
            selectedCamera={selectedCamera}
            selectedLandmark={selectedLandmark}
            setSelectedLandmark={setSelectedLandmark}
            setPanValue={setPanValue}
            setTiltValue={setTiltValue}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="pan-value">Pan Value:</Label>
          <Input
            id="pan-value"
            type="number"
            value={panValue}
            onChange={(e) => {
              setPanValue(e.target.value)
              validatePan(e.target.value)
            }}
            className="w-full"
          />
          {panError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{panError}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="mb-4">
          <Label htmlFor="tilt-value">Tilt Value:</Label>
          <Input
            id="tilt-value"
            type="number"
            value={tiltValue}
            onChange={(e) => {
              setTiltValue(e.target.value)
              validateTilt(e.target.value)
            }}
            className="w-full"
          />
          {tiltError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{tiltError}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="mb-4">
          <Label htmlFor="zoom-value">Zoom Value:</Label>
          <Input
            id="zoom-value"
            type="number"
            value={zoomValue}
            onChange={(e) => {
              setZoomValue(e.target.value)
              validateZoom(e.target.value)
            }}
            className="w-full"
          />
          {zoomError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{zoomError}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex justify-between mb-4">
          <Button onClick={handleMove} className="mr-2">
            Move
          </Button>
          <Button onClick={handleUpdate}>Update Configuration</Button>
        </div>
        <div className="mb-4">
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImport} />
          <Button onClick={() => fileInputRef.current?.click()}>Import Configuration</Button>
        </div>
        <div className="mt-4">
          <h3>Camera Status:</h3>
          {Object.entries(cameraStatus).map(([camera, status]) => (
            <div key={camera}>
              Camera {camera}: {status}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

