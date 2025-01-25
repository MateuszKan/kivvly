'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image';

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesChange }) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)

    const filePromises = files.map(async (file) => {
      const response = await fetch(URL.createObjectURL(file))
      const blob = await response.blob()
      return new File([blob], file.name, { type: file.type })
    })

    const resolvedFiles = await Promise.all(filePromises)
    onImagesChange(resolvedFiles)
  }

  const handleRemoveImage = async (index: number) => {
    const updatedUrls = previewUrls.filter((_, i) => i !== index)
    setPreviewUrls(updatedUrls)

    const filePromises = updatedUrls.map(async (url) => {
      const response = await fetch(url)
      const blob = await response.blob()
      return new File([blob], "image.jpg", { type: "image/jpeg" })
    })

    const resolvedFiles = await Promise.all(filePromises)
    onImagesChange(resolvedFiles)
  }

  return (
    <div>
      <label htmlFor="photo-upload" className="block text-sm font-medium text-gray-700 mb-2">
        Photo Upload
      </label>
      <input
        type="file"
        id="photo-upload"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        multiple
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {previewUrls.map((url, index) => (
          <div key={index} className="relative">
            <Image src={url} alt={`Preview ${index + 1}`} width={100} height={100} />
            <button
              onClick={() => handleRemoveImage(index)}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs"
              aria-label={`Remove image ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ImageUpload;
