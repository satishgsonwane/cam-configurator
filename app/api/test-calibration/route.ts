import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

function installDependencies(dependencies: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const installProcess = spawn('/usr/bin/python3', ['-m', 'pip', 'install', ...dependencies])

    installProcess.stdout.on('data', (data) => {
      console.log(data.toString())
    })

    installProcess.stderr.on('data', (data) => {
      console.error(data.toString())
    })

    installProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to install dependencies'))
      } else {
        resolve()
      }
    })
  })
}

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
          PATH: `${process.env.PATH}:/home/user/.local/bin`
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

      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          if (error.includes("ModuleNotFoundError")) {
            const moduleMatch = error.match(/No module named '(\w+)'/)
            if (!moduleMatch) {
              resolve(NextResponse.json({ error: 'Unable to determine missing module' }, { status: 500 }))
              return
            }
            const missingModule = moduleMatch[1]
            try {
              await installDependencies([missingModule])
              resolve(NextResponse.json({ message: `Installed missing module: ${missingModule}. Please retry the request.` }, { status: 500 }))
            } catch (installError) {
              resolve(NextResponse.json({ error: 'Failed to install missing dependencies' }, { status: 500 }))
            }
          } else {
            resolve(NextResponse.json({ error: error || 'Test failed' }, { status: 500 }))
          }
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