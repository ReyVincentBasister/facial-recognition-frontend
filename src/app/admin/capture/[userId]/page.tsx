"use client"

import { useState, useEffect, useRef, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Camera, CheckCircle2, Loader2, AlertCircle, ScanFace, Move } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

// Removed server actions imports
// import { getStudentById, updateStudent } from "@/actions/student"
import { loadFaceApiModels, detectFaceDescriptor } from "@/lib/face-recognition"

export default function FaceCapturePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [user, setUser] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // New state for training progress
  const [captureProgress, setCaptureProgress] = useState(0)
  const [feedback, setFeedback] = useState("Ready to start")
  // ⬆️ INCREASED: Capture more samples to build a robust average
  const MAX_SAMPLES = 30 

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()

  // Pointing to your Spring Boot Backend
  const SPRING_API_URL = "http://localhost:8080/api/students"

  // ------------------------------
  // Load student and models
  // ------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch student from Spring Boot
        const res = await fetch(`${SPRING_API_URL}/${userId}`)
        
        if (!res.ok) {
          setError("User not found")
          setIsLoading(false)
          return
        }

        const student = await res.json()
        setUser(student)
        setIsLoading(false)

        await loadModels()
      } catch (err) {
        console.error(err)
        setError("Failed to load student data")
        setIsLoading(false)
      }
    }

    loadData()

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [userId])

  const loadModels = async () => {
    try {
      setLoadingProgress(25)
      await loadFaceApiModels()
      setLoadingProgress(100)
      setModelsLoaded(true)
    } catch (err) {
      console.error("Error loading models:", err)
      setError("Failed to load face recognition models. Please refresh the page.")
    }
  }

  // ------------------------------
  // Camera control
  // ------------------------------
  const startCamera = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
            width: 640, 
            height: 480, 
            facingMode: "user" 
        },
      })

      // ⬇️ Try to enforce continuous focus if the hardware supports it
      const track = mediaStream.getVideoTracks()[0];
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const capabilities = track.getCapabilities() as any; // Type casting for advanced constraints
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          try {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
          } catch (e) {
            console.log("Could not set continuous focus", e);
          }
      }

      setStream(mediaStream)
      setIsCapturing(true)

      const waitForVideo = () =>
        new Promise<void>((resolve) => {
          const check = () => {
            if (videoRef.current) return resolve()
            requestAnimationFrame(check)
          }
          check()
        })
      await waitForVideo()

      const video = videoRef.current!
      video.srcObject = mediaStream
      video.onloadedmetadata = () => video.play().catch(() => {})
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Failed to access camera. Please grant camera permissions.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCapturing(false)
  }

  // ------------------------------
  // Capture & save descriptor
  // ------------------------------
  const captureAndTrain = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return
    
    try {
      setIsSaving(true)
      setError(null)
      setCaptureProgress(0)
      setFeedback("Starting capture...")

      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      // Update Type to accept both Float32Array and number[]
      const descriptors: (Float32Array | number[])[] = []

      // 🔄 Capture loop for multiple samples
      while (descriptors.length < MAX_SAMPLES) {
        // Draw current video frame
        ctx.drawImage(video, 0, 0)
        
        // Attempt detection
        const descriptor = await detectFaceDescriptor(canvas)
        
        if (descriptor) {
            descriptors.push(descriptor)
            setFeedback("Scanning face details...")
            
            // Update progress UI
            setCaptureProgress(Math.round((descriptors.length / MAX_SAMPLES) * 100))
            
            // ⬇️ Adjusted delay: 100ms * 30 samples = ~3 seconds of scanning
            // We removed the strict Euclidean check to prevent stalling, 
            // but we keep the delay to capture temporal variations naturally.
            await new Promise(r => setTimeout(r, 100))
        } else {
            setFeedback("Face not detected. Please look at the camera.")
            // Wait a bit before retrying if face lost
            await new Promise(r => setTimeout(r, 100))
        }
      }

      setFeedback("Processing data...")

      // 🧮 Calculate Average Descriptor (Mean)
      const numSamples = descriptors.length
      const vectorSize = descriptors[0].length
      const avgDescriptor = new Float32Array(vectorSize)

      for (let i = 0; i < vectorSize; i++) {
          let sum = 0
          for (const d of descriptors) {
              sum += d[i]
          }
          avgDescriptor[i] = sum / numSamples
      }

      // ⬇️ SAVE TO SPRING BOOT DATABASE
      // We send the computed average descriptor
      const res = await fetch(`${SPRING_API_URL}/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
             ...user,
             faceDescriptor: Array.from(avgDescriptor) // Convert Float32Array to standard array
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to update student in backend")
      }

      setSuccess(true)
      setFeedback("Done!")
      stopCamera()

      setTimeout(() => router.push("/admin"), 2000)
    } catch (err) {
      console.error("Error capturing face:", err)
      setError(err instanceof Error ? err.message : "Failed to capture face. Please try again.")
      setIsSaving(false)
      setCaptureProgress(0)
      setFeedback("Error occurred")
    }
  }

  // ------------------------------
  // Render
  // ------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
            <CardDescription>The requested user could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin">
              <Button>Back to Admin</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Face Capture & Training
            </h1>
            <p className="text-muted-foreground mt-1">Training face recognition for {user.name}</p>
          </div>
        </div>

        {/* Loading Models */}
        {!modelsLoaded && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Loading face recognition models...</span>
                  <span>{loadingProgress}%</span>
                </div>
                <Progress value={loadingProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Success!</AlertTitle>
            <AlertDescription className="text-green-600">
              Face captured successfully. Redirecting...
            </AlertDescription>
          </Alert>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Student Info */}
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>Details of the student being registered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-mono">{user.studentId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Face Status</p>
                <p className="font-semibold">
                  {user.faceDescriptor ? "Previously Trained" : "Not Trained"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right: Camera Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Camera Feed</CardTitle>
              <CardDescription>
                {/* ⬇️ UPDATED INSTRUCTIONS */}
                {isSaving 
                 ? "Please keep your face centered. You may tilt your head slightly." 
                 : "Position your face in the center of the frame"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                {isCapturing ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 border-4 border-blue-500/50 rounded-lg pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-blue-400 rounded-full" />
                    </div>
                    {/* Live Feedback Overlay */}
                    {isSaving && (
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <span className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm">
                                {feedback}
                            </span>
                        </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm opacity-75">Camera not active</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar for Training */}
              {isSaving && (
                 <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-blue-600">
                        <span>Training Progress</span>
                        <span>{captureProgress}%</span>
                    </div>
                    <Progress value={captureProgress} className="h-2" />
                 </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              <div className="space-y-2">
                {!isCapturing ? (
                  <Button onClick={startCamera} className="w-full gap-2" disabled={!modelsLoaded}>
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={captureAndTrain}
                      className="w-full gap-2"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Move className="w-4 h-4 animate-pulse" />
                          {feedback}
                        </>
                      ) : (
                        <>
                          <ScanFace className="w-4 h-4" />
                          Start Face Training
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      className="w-full bg-transparent"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}