import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { selectedCamera } = await request.json()
    
    if (!selectedCamera) {
      return NextResponse.json({ error: 'No camera selected' }, { status: 400 })
    }

    // Extract just the camera number from the string (e.g., "camera1" -> "1")
    const cameraId = selectedCamera.replace(/\D/g, '')
    if (!cameraId) {
      return NextResponse.json({ error: 'Invalid camera ID format' }, { status: 400 })
    }

    return new Promise((resolve) => {
      const pythonProcess = spawn('/usr/bin/python3', [
        path.join(process.cwd(), 'test', 'test_calibration_std.py'),
        cameraId
      ], {
        env: {
          ...process.env,
          PYTHONPATH: process.env.PYTHONPATH || '',
          PYTHONHOME: undefined,
          PATH: process.env.PATH
        }
      })

      let output = ''
      let error = ''

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString()
      })

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          resolve(NextResponse.json({ error: error || 'Test failed' }, { status: 500 }))
        } else {
          try {
            const results = JSON.parse(output)
            resolve(NextResponse.json(results))
          } catch {
            resolve(NextResponse.json({ error: 'Invalid output format' }, { status: 500 }))
          }
        }
      })
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 