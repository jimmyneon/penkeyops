'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, Upload } from 'lucide-react'
import { uploadEvidencePhoto } from '@/lib/storage'

interface PhotoUploadProps {
  resultId: string
  userId: string
  onPhotoUploaded: (url: string) => void
  existingPhoto?: string
}

export function PhotoUpload({ resultId, userId, onPhotoUploaded, existingPhoto }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(existingPhoto || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploading(true)
    const url = await uploadEvidencePhoto(file, resultId, userId)
    setUploading(false)

    if (url) {
      onPhotoUploaded(url)
    } else {
      alert('Failed to upload photo')
      setPreview(null)
    }
  }

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onPhotoUploaded('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Evidence"
            className="w-full h-48 object-cover rounded-xl shadow-sm"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraCapture}
            disabled={uploading}
            className="h-24 flex-col"
          >
            <Camera className="h-8 w-8 mb-2" />
            <span className="text-sm">Take Photo</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-24 flex-col"
          >
            <Upload className="h-8 w-8 mb-2" />
            <span className="text-sm">Upload</span>
          </Button>
        </div>
      )}

      {uploading && (
        <p className="text-sm text-gray-600 text-center">Uploading photo...</p>
      )}
    </div>
  )
}
