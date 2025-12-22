"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  UserPlus,
  Trash2,
  Camera,
  ArrowLeft,
  Users,
  ClipboardList,
  Calendar,
  Loader2, // Imported Loader2 for the spinner
} from "lucide-react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function AdminPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [students, setStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true) // Added loading state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    studentId: "",
  })
  const router = useRouter()

  // Pointing to your Spring Boot Backend
  const SPRING_API_URL = "http://localhost:8080/api/students"

  /* -----------------------------------
      LOAD STUDENTS FROM SPRING BOOT
  ----------------------------------- */
  const loadStudents = async () => {
    setIsLoading(true) // Start loading
    try {
      const res = await fetch(SPRING_API_URL)
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      } else {
        console.error("Failed to fetch students from Spring Boot")
      }
    } catch (error) {
      console.error("Error connecting to Spring Boot:", error)
    } finally {
      setIsLoading(false) // Stop loading whether successful or not
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  /* -----------------------------------
      CREATE STUDENT (SPRING BOOT)
  ----------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch(SPRING_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          faceDescriptor: null, // Matches your DTO expectations
        }),
      })

      if (res.ok) {
        const newStudent = await res.json()
        await loadStudents() // Reload list (will trigger loading state)

        setFormData({ name: "", email: "", studentId: "" })
        setShowForm(false)

        // Redirect to face capture
        router.push(`/admin/capture/${newStudent.id}`)
      } else {
        console.error("Failed to create student in Spring Boot")
      }
    } catch (error) {
      console.error("Error creating student:", error)
    }
  }

  /* -----------------------------------
      DELETE STUDENT (SPRING BOOT)
  ----------------------------------- */
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${SPRING_API_URL}/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await loadStudents() // Reload list
      } else {
        console.error("Failed to delete student from Spring Boot")
      }
    } catch (error) {
      console.error("Error deleting student:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">App Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage students and monitor attendance
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/events">
              <Button variant="outline" className="gap-2 bg-transparent">
                <Calendar className="w-4 h-4" />
                Manage Events
              </Button>
            </Link>

            <Link href="/logs">
              <Button variant="outline" className="gap-2 bg-transparent">
                <ClipboardList className="w-4 h-4" />
                View Logs
              </Button>
            </Link>

            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Student
            </Button>
          </div>
        </div>

        {/* FORM */}
        {showForm && (
          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle>Register New Student</CardTitle>
              <CardDescription>
                Enter student details to create a new profile
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      placeholder="STU-12345"
                      value={formData.studentId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          studentId: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="gap-2">
                    <Camera className="w-4 h-4" />
                    Save & Capture Face
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STUDENT TABLE */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Registered Students
                </CardTitle>

                <CardDescription>
                  Total: {students.length} students
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No students registered yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first student
                </p>

                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add First Student
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Face Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {students.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.studentId}</TableCell>
                        <TableCell>{u.email}</TableCell>

                        <TableCell>
                          {u.faceDescriptor ? (
                            <Badge>Trained</Badge>
                          ) : (
                            <Badge variant="secondary">Not Trained</Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/capture/${u.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 bg-transparent"
                              >
                                <Camera className="w-3 h-3" />
                                {u.faceDescriptor ? "Retrain" : "Capture"}
                              </Button>
                            </Link>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-2"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>

                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {u.name}? This
                                    action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(u.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}