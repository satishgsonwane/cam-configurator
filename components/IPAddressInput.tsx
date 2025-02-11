"use client"

import React, { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface IPAddressInputProps {
  ipAddress: string
  setIpAddress: (value: string) => void
}

const IPAddressInput: React.FC<IPAddressInputProps> = ({ ipAddress, setIpAddress }) => {
  const [octets, setOctets] = useState(["", "", "", ""])

  useEffect(() => {
    const parts = ipAddress.split(".")
    setOctets(parts.concat(Array(4 - parts.length).fill("")))
  }, [ipAddress])

  const handleOctetChange = (index: number, value: string) => {
    const newValue = value.replace(/[^0-9]/g, "").slice(0, 3)
    const newOctets = [...octets]
    newOctets[index] = newValue
    setOctets(newOctets)
    setIpAddress(newOctets.join("."))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "." || event.key === " ") {
      event.preventDefault()
      const nextInput = document.getElementById(`octet-${index + 1}`)
      if (nextInput) {
        ;(nextInput as HTMLInputElement).focus()
      }
    }
  }

  return (
    <div className="mb-4">
      <Label htmlFor="ip-address">IP Address:</Label>
      <div className="flex items-center">
        {octets.map((octet, index) => (
          <React.Fragment key={index}>
            <Input
              id={`octet-${index}`}
              type="text"
              value={octet}
              onChange={(e) => handleOctetChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-16 text-center font-mono"
              maxLength={3}
            />
            {index < 3 && <span className="mx-1">.</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default IPAddressInput

