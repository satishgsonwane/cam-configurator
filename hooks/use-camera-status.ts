import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export function useCameraStatus() {
  const [status, setStatus] = useState<Record<string, string>>({})

  useEffect(() => {
    const socket = io(`http://localhost:${process.env.NEXT_PUBLIC_API_PORT}`)

    socket.on('status_update', (data: { camera: string; status: string }) => {
      setStatus(prev => ({
        ...prev,
        [data.camera]: data.status
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return status
} 