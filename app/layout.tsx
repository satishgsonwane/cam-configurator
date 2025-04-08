import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: 'Camera Calibration',
  description: 'Created with v0',
  generator: 'OZ Sports',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Toaster richColors />
    </html>
  )
}
