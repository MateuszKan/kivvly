"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function JobSelection() {
  const [job, setJob] = useState("")

  const handleJobChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setJob(event.target.value)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    // Here you would typically send the new job to your backend
    console.log("Job updated:", job)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="job">Job/Occupation</Label>
      <div className="flex space-x-2">
        <Input
          id="job"
          value={job}
          onChange={handleJobChange}
          placeholder="Enter your job or occupation"
        />
        <Button type="submit">Update</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        This information helps us tailor your experience and connect you with relevant communities.
      </p>
    </form>
  )
}

