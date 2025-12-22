"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  getEvents, 
  createEvent, 
  deleteEvent, 
  getActiveEvent, 
  setActiveEvent, 
  type Event 
} from "@/actions/event";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

import { CalendarPlus, Trash2, ArrowLeft, Calendar, CheckCircle2 } from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEventState] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    description: "",
  });
  const router = useRouter();

  // Load events & active event on mount
  useEffect(() => {
    loadEvents();
    loadActiveEvent();
  }, []);

  // Load all events from server
  const loadEvents = async () => {
    const allEvents = await getEvents();
    // Optional: sort by startTime descending
    setEvents(allEvents.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
  };

  // Load active event from server
  const loadActiveEvent = async () => {
    const active = await getActiveEvent();
    setActiveEventState(active);
  };

  // Create event
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startTime) return;

    await createEvent({
      name: formData.name,
      startTime: new Date(formData.startTime),
      description: formData.description || undefined,
    });

    setFormData({ name: "", startTime: "", description: "" });
    setShowForm(false);
    await loadEvents();
  };

  // Delete event
  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    if (activeEvent?.id === id) setActiveEventState(null);
    await loadEvents();
  };

  // Set active event
  const handleSetActive = async (event: Event) => {
    await setActiveEvent(event.id);
    setActiveEventState(event);
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Event Management</h1>
              <p className="text-muted-foreground mt-1">Create and manage events for attendance tracking</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <CalendarPlus className="w-4 h-4" />
            Create Event
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle>Create New Event</CardTitle>
              <CardDescription>Set up a new event for attendance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Class Lecture, Meeting, Workshop"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional event description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="gap-2">
                    <CalendarPlus className="w-4 h-4" />
                    Create Event
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Total Events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{events.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Active Event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-primary">{activeEvent?.name || "None"}</div>
              {activeEvent && (
                <p className="text-xs text-muted-foreground mt-2">{formatDateTime(activeEvent.startTime)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Event ID</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono text-muted-foreground">{activeEvent?.id || "—"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Events
            </CardTitle>
            <CardDescription>All created events</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events created yet</h3>
                <p className="text-muted-foreground mb-4">Create your first event to start tracking attendance</p>
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <CalendarPlus className="w-4 h-4" />
                  Create Event
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell>{formatDateTime(event.startTime)}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{event.description}</TableCell>
                        <TableCell className="text-center">
                          {activeEvent?.id === event.id ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {activeEvent?.id !== event.id ? (
                              <Button size="sm" variant="outline" onClick={() => handleSetActive(event)} className="gap-2 bg-transparent">
                                <CheckCircle2 className="w-3 h-3" /> Set Active
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled className="gap-2 bg-transparent">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="gap-2">
                                  <Trash2 className="w-3 h-3" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{event.name}&quot;? This will not delete attendance records.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(event.id)}>Delete</AlertDialogAction>
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
  );
}
