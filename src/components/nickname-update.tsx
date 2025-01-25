"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function NicknameUpdate() {
  const [nickname, setNickname] = useState("CoolUser123")

  const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(event.target.value)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    // Here you would typically send the new nickname to your backend
    console.log("Nickname updated:", nickname)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="nickname">Nickname</Label>
      <div className="flex space-x-2">
        <Input
          id="nickname"
          value={nickname}
          onChange={handleNicknameChange}
          placeholder="Enter your nickname"
        />
        <Button type="submit">Update</Button>
      </div>
    </form>
  )
}

