"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, CheckCircle, UserPlus, BarChart3, Settings } from "lucide-react"
import Link from "next/link"
import { AttendanceCamera } from "@/components/attendance-camera"

export default function HomePage() {
  const [showCamera, setShowCamera] = useState(false)

  if (showCamera) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <AttendanceCamera onClose={() => setShowCamera(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-end">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Admin Panel
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-balance mb-6 text-foreground">Face Attendance System</h1>
          <p className="text-xl text-muted-foreground mb-8 text-pretty leading-relaxed">
            Automated attendance tracking powered by facial recognition technology. Fast, accurate, and secure.
          </p>

          <Button size="lg" className="gap-2 text-lg px-8 py-6 h-auto" onClick={() => setShowCamera(true)}>
            <Camera className="w-5 h-5" />
            Start Attendance
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10 text-foreground">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Register Students</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Admin captures student photos and trains the face recognition system with their facial data.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Auto-Detect Faces</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  System automatically identifies and recognizes students through the camera in real-time.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Track Records</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  View comprehensive logs and monitor attendance patterns with detailed analytics.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
