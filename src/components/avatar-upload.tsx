"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export function AvatarUpload() {
  const [avatar, setAvatar] = useState("/placeholder.svg")

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={avatar} alt="User avatar" />
        <AvatarFallback>UN</AvatarFallback>
      </Avatar>
      <div>
        <Label htmlFor="avatar-upload" className="cursor-pointer">
          <Button variant="outline" className="mr-2">
            Change Avatar
          </Button>
        </Label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>
    </div>
  )
}

