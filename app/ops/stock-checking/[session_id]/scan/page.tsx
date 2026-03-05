'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Camera, RefreshCw } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ScanPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.session_id as string
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [cameraActive, setCameraActive] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const startCamera = async () => {
    console.log('startCamera called')
    try {
      console.log('Requesting camera access...')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      
      console.log('Camera stream obtained:', mediaStream)
      
      // Store stream and set camera active - this will trigger render with video element
      setStream(mediaStream)
      setCameraActive(true)
      setError(null)
      console.log('Set stream and cameraActive to true')
    } catch (err) {
      console.error('Camera error:', err)
      setError('Camera access denied. Please enable camera permissions.')
    }
  }

  // Attach stream to video element when it becomes available
  useEffect(() => {
    if (stream && videoRef.current && cameraActive) {
      console.log('Attaching stream to video element')
      videoRef.current.srcObject = stream
      
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded, playing...')
        videoRef.current?.play().catch(err => {
          console.error('Video play error:', err)
          setError('Failed to start video playback')
        })
      }
    }
  }, [stream, cameraActive])

  const stopCamera = () => {
    if (stream) {
      console.log('Stopping camera stream')
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setCapturing(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0)

    // Convert to JPEG with quality 0.75
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.75)

    // Quality checks
    const qualityCheck = await checkImageQuality(canvas, context)
    
    if (!qualityCheck.passed) {
      setError(qualityCheck.message)
      setCapturing(false)
      return
    }

    // Stop camera
    stopCamera()

    // Send to API for scanning
    await scanImage(imageDataUrl)
  }

  const checkImageQuality = async (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Check brightness (average pixel value)
    let totalBrightness = 0
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      totalBrightness += avg
    }
    const avgBrightness = totalBrightness / (data.length / 4)

    if (avgBrightness < 50) {
      return { passed: false, message: 'Image too dark. Please improve lighting.' }
    }
    if (avgBrightness > 230) {
      return { passed: false, message: 'Image too bright or washed out. Reduce glare.' }
    }

    // Basic blur detection would go here (variance of Laplacian)
    // Simplified for now

    return { passed: true, message: '' }
  }

  const scanImage = async (imageDataUrl: string) => {
    console.log('scanImage called, sessionId:', sessionId)
    setScanning(true)
    setError(null)

    try {
      console.log('Sending scan request to API...')
      const response = await fetch('/api/stock-checking/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          image_base64: imageDataUrl.split(',')[1]
        })
      })

      console.log('Scan API response status:', response.status)
      const result = await response.json()
      console.log('Scan API result:', result)

      if (!response.ok) {
        console.error('Scan API error:', result)
        throw new Error(result.error || 'Scan failed')
      }

      console.log('Scan successful, redirecting to review...')
      // Redirect to review page
      router.push(`/ops/stock-checking/${sessionId}/review`)
    } catch (err: any) {
      console.error('Scan error:', err)
      setError(err.message || 'Failed to scan image. Please try again.')
      setScanning(false)
      setCapturing(false)
      startCamera() // Restart camera for retry
    }
  }

  const retake = () => {
    setError(null)
    setCapturing(false)
    startCamera()
  }

  console.log('Render - cameraActive:', cameraActive, 'scanning:', scanning, 'capturing:', capturing)

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              stopCamera()
              router.push('/ops/stock-checking')
            }}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Scan Sheet</h1>
            <p className="text-xs text-muted-foreground">Session: {sessionId}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4">
        {!cameraActive && !scanning ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-bold mb-3">Ready to Scan</h2>
              <p className="text-muted-foreground mb-4">
                Position the completed stock check sheet flat on a surface with good lighting.
              </p>
              
              <div className="bg-muted/50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold mb-2">Tips for best results:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Ensure good, even lighting (no shadows or glare)</li>
                  <li>Keep the sheet flat and all corners visible</li>
                  <li>Hold camera steady directly above the sheet</li>
                  <li>Make sure all handwriting is clear and visible</li>
                </ul>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive rounded-xl p-4 mb-4">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={startCamera}
                className="w-full bg-primary text-white py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3"
              >
                <Camera className="h-5 w-5" />
                Start Camera
              </button>
            </div>
          </div>
        ) : scanning ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">Scanning...</h2>
            <p className="text-muted-foreground">AI is reading the handwritten counts. This may take 10-20 seconds.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Camera viewfinder with overlay guide */}
            <div className="relative max-w-2xl mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-2xl shadow-2xl"
              />
              
              {/* A4 overlay guide - portrait aspect ratio 1:1.414 */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* A4 portrait box centered */}
                <div className="relative" style={{ width: '70%', aspectRatio: '1/1.414' }}>
                  <div className="absolute inset-0 border-4 border-primary/60 rounded-lg">
                    {/* Corner markers */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
                  </div>
                  <div className="absolute -top-12 left-0 right-0 text-center">
                    <p className="text-white text-sm font-semibold bg-black/70 inline-block px-4 py-2 rounded-full">
                      Fit A4 sheet within frame
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Capture button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
              <div className="max-w-2xl mx-auto flex gap-3">
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-muted text-foreground py-4 rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={captureImage}
                  disabled={capturing}
                  className="flex-[2] bg-primary text-white py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <Camera className="h-5 w-5" />
                  {capturing ? 'Processing...' : 'Take Photo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
