import { NextResponse } from "next/server"
import { spawn } from "child_process"

export async function POST() {
  try {
    const pythonProcess = spawn('python3', [
      `${process.cwd()}/app/data/json_formatter.py`,
      `${process.cwd()}/app/data/imported.json`,
      `${process.cwd()}/app/data/config1.json`,
      `${process.cwd()}/app/data/config.json`
    ])

    let errorOutput = ''
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    return await new Promise((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}: ${errorOutput}`)
          resolve(NextResponse.json({ error: "Formatting failed" }, { status: 500 }))
        } else {
          resolve(NextResponse.json({ success: true }))
        }
      })
    })
  } catch (error) {
    console.error("Error formatting config:", error)
    return NextResponse.json({ error: "Formatting failed" }, { status: 500 })
  }
} 