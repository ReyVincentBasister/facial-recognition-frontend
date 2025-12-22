"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getUsers, type User } from "@/lib/storage"
import { ArrowLeft, Users, Mail, Award as IdCard, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function StudentsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setUsers(getUsers())
  }, [])

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-balance bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Student Directory
              </h1>
              <p className="text-muted-foreground mt-1">Browse all registered students</p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <Input
              placeholder="Search by name, student ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No students found" : "No students registered yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Try a different search term" : "Students will appear here once registered"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg mb-2">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {user.faceDescriptor ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Trained
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        Not Trained
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{user.name}</CardTitle>
                  <CardDescription>Registered {new Date(user.createdAt).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <IdCard className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">{user.studentId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">Total Students: {users.length}</p>
          <Link href="/admin">
            <Button variant="outline">Go to Admin Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
