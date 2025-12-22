"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// We will implement local matching to control the threshold, so findBestMatch is removed from imports if desired, 
// but we keep detectFaceDescriptor.
import { loadFaceApiModels, detectFaceDescriptor } from "@/lib/face-recognition";
import {
  Camera,
  CheckCircle2,
  Loader2,
  AlertCircle,
  UserCheck,
  X,
  Clock,
  ScanFace,
  Sun,
  CalendarDays,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Define interfaces locally to replace server action types
export interface User {
  id: string;
  name: string;
  studentId: string;
  email: string;
  faceDescriptor?: number[] | null;
}

export interface Event {
  id: string;
  name: string;
  startTime: string; // ISO string from JSON
  description?: string; // Updated to match backend
}

interface RecognizedStudent {
  user: User;
  confidence: number;
  timestamp: Date;
  isLate: boolean;
}

interface AttendanceCameraProps {
  onClose?: () => void;
}

// ⬇️ HELPER: Calculate Euclidean Distance locally
// This allows us to tune the threshold. Lower distance = better match.
// 0.6 is typical for face-api.js. < 0.4 is very strict. > 0.6 is loose.
const getEuclideanDistance = (d1: number[] | Float32Array, d2: number[] | Float32Array) => {
  if (d1.length !== d2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < d1.length; i++) {
    sum += Math.pow(d1[i] - d2[i], 2);
  }
  return Math.sqrt(sum);
};

// CHANGED BACK: Named export to prevent app crash
export function AttendanceCamera({ onClose }: AttendanceCameraProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // NEW: State for fetching attendance logs
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [recognizedStudents, setRecognizedStudents] = useState<RecognizedStudent[]>([]);
  const [currentDetection, setCurrentDetection] = useState<string | null>(null);
  const [isLowLight, setIsLowLight] = useState(false);

  // ⬇️ CONFIG: Tune this for robustness. 
  // 0.6 is standard. If still failing, try 0.65 (but risk of false positives increases).
  const MATCH_THRESHOLD = 0.6; 

  // markedIds prevents duplicates (persisted from server for selected event)
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  
  // Refs for loop access
  const markedIdsRef = useRef<Set<string>>(new Set()); 
  const usersRef = useRef<User[]>([]);
  const eventsRef = useRef<Event[]>([]);
  // CRITICAL FIX: Ref for selectedEventId so the setInterval closure always sees the CURRENT event
  const selectedEventIdRef = useRef<string>("");

  // refs
  const hasStartedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  // API Base URLs
  const API_BASE_URL = "http://localhost:8080/api";

  // Sync refs
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { markedIdsRef.current = markedIds; }, [markedIds]);
  useEffect(() => { selectedEventIdRef.current = selectedEventId; }, [selectedEventId]);

  // --- initialize: load users, events, active event, models ---
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch Students
        const studentsRes = await fetch(`${API_BASE_URL}/students`);
        if (!studentsRes.ok) throw new Error("Failed to fetch students");
        const allUsers: User[] = await studentsRes.json();

        // filter trained & descriptor is already an array from Spring Boot DTO
        const trained = allUsers
          .filter((u) => u.faceDescriptor != null && Array.isArray(u.faceDescriptor))
          .map((u) => ({
            ...u,
            // Ensure descriptor is array of numbers (Spring returns List<Double>)
            faceDescriptor: u.faceDescriptor, 
          }));

        if (!mounted) return;
        setUsers(trained);

        // 2. Fetch Events
        const eventsRes = await fetch(`${API_BASE_URL}/events`);
        let currentEvents: Event[] = [];
        if (eventsRes.ok) {
            currentEvents = await eventsRes.json();
            if (mounted) setEvents(currentEvents);
        }

        // 3. Fetch Active Event & Auto-Select
        const activeRes = await fetch(`${API_BASE_URL}/events/active`);
        if (activeRes.ok && activeRes.status !== 204) {
            const text = await activeRes.text();
            if (text && mounted) {
                try {
                    const active: Event = JSON.parse(text);
                    setActiveEvent(active);
                    setSelectedEventId(active.id);
                } catch (e) {
                    console.error("Failed to parse active event", e);
                }
            }
        } else if (mounted && currentEvents.length > 0) {
            // Fallback: If no active event set, default to the most recent one
            const sorted = [...currentEvents].sort((a, b) => 
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
            setSelectedEventId(sorted[0].id);
        }

        await loadModels();
      } catch (err) {
        console.error("init error:", err);
        setError("Failed to load initial data. Ensure backend is running.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();
    return () => { mounted = false; };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- load face models ---
  const loadModels = async () => {
    try {
      setLoadingProgress(25);
      await loadFaceApiModels();
      setLoadingProgress(100);
      setModelsLoaded(true);
    } catch (err) {
      console.error("Error loading models", err);
      setError("Failed to load face recognition models.");
    }
  };

  // --- when selectedEventId changes: fetch attendance ---
  useEffect(() => {
    // 1. Reset state immediately to avoid showing wrong data or ghost duplicates
    setRecognizedStudents([]);
    setMarkedIds(new Set());
    markedIdsRef.current = new Set(); // Sync ref immediately

    if (!selectedEventId) return;

    let cancelled = false;
    const fetchPresent = async () => {
      setIsFetchingAttendance(true);
      try {
        // get server logs for event
        const res = await fetch(`${API_BASE_URL}/attendance/event/${selectedEventId}`);
        if (!res.ok) return; 
        
        const logs = await res.json();
        if (cancelled) return;

        // 🛑 DEDUPLICATION LOGIC: Ensure we only show one entry per studentId
        const processedIds = new Set<string>();
        const mapped: RecognizedStudent[] = [];

        // Sort by timestamp desc (newest first)
        const sortedLogs = Array.isArray(logs) 
            ? logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            : [];

        for (const log of sortedLogs) {
            if (processedIds.has(log.studentId)) continue; // Skip duplicates

            const user = users.find((u) => u.studentId === log.studentId);
            if (!user) continue;

            processedIds.add(log.studentId);
            mapped.push({
              user,
              confidence: Number(log.confidence) || 0,
              timestamp: new Date(log.timestamp),
              isLate: log.status === "late",
            });
        }

        setRecognizedStudents(mapped);
        setMarkedIds(processedIds);
        markedIdsRef.current = processedIds; 
      } catch (err) {
        console.error("Failed to fetch present students", err);
      } finally {
        if (!cancelled) setIsFetchingAttendance(false);
      }
    };

    if (users.length > 0) {
        fetchPresent();
    }
    
    return () => { cancelled = true; };
  }, [selectedEventId, users]);

  // --- bind stream to video element when available ---
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // --- camera controls ---
  const startCamera = async () => {
    try {
      setError(null);
      // 1. Enforce resolution for consistent accuracy
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: 640, 
            height: 480, 
            facingMode: "user" 
        } 
      });

      // 2. Try to enable continuous autofocus if hardware supports it
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any; 
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          try {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
          } catch (e) {
            console.log("Could not set continuous focus", e);
          }
      }

      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setIsCapturing(true);
      
      window.setTimeout(startContinuousDetection, 600);
    } catch (err) {
      console.error("startCamera error:", err);
      setError("Failed to access camera.");
    }
  };

  const stopCamera = () => {
    hasStartedRef.current = false;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (detectionIntervalRef.current) window.clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = null;
    setIsCapturing(false);
    setCurrentDetection(null);
  };

  const startContinuousDetection = () => {
    if (detectionIntervalRef.current) {
      window.clearInterval(detectionIntervalRef.current);
    }
    // 3. FASTER SCANNING (500ms)
    detectionIntervalRef.current = window.setInterval(() => {
      void detectAndRecognizeFace();
    }, 500); 
  };

  useEffect(() => {
    if (modelsLoaded && !hasStartedRef.current) {
      hasStartedRef.current = true;
      void startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoaded]);

  // --- helper to check lateness ---
  const isStudentLate = (recognitionTime: Date, eventStartTime: Date) => {
    return recognitionTime > eventStartTime;
  };

  // --- check image brightness ---
  const checkBrightness = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let r, g, b, avg;
    let colorSum = 0;
    for (let x = 0, len = data.length; x < len; x += 4) {
      r = data[x];
      g = data[x + 1];
      b = data[x + 2];
      avg = Math.floor((r + g + b) / 3);
      colorSum += avg;
    }
    const brightness = Math.floor(colorSum / (width * height));
    setIsLowLight(brightness < 80);
  };

  // --- core detection function ---
  const detectAndRecognizeFace = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    try {
      setIsProcessing(true);

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.drawImage(video, 0, 0);
      
      checkBrightness(ctx, canvas.width, canvas.height);

      const descriptor = await detectFaceDescriptor(canvas);
      if (!descriptor) {
        setCurrentDetection("No face detected");
        setIsProcessing(false);
        return;
      }

      if (!usersRef.current || usersRef.current.length === 0) {
        setCurrentDetection("Face detected - no trained students");
        setIsProcessing(false);
        return;
      }

      // ⬇️ LOCAL MATCHING LOGIC
      let bestMatch = { userId: "", distance: 2.0 };

      usersRef.current.forEach((user) => {
        if (user.faceDescriptor) {
            const distance = getEuclideanDistance(descriptor, user.faceDescriptor);
            if (distance < bestMatch.distance) {
                bestMatch = { userId: user.id, distance };
            }
        }
      });

      if (bestMatch.distance > MATCH_THRESHOLD) {
        setCurrentDetection("Face detected but not recognized. Move closer/adjust angle.");
        setIsProcessing(false);
        return;
      }

      const user = usersRef.current.find((u) => u.id === bestMatch.userId);
      if (!user) {
        setCurrentDetection("Match found but user data missing");
        setIsProcessing(false);
        return;
      }

      const confidenceScore = Math.max(0, 1 - bestMatch.distance);
      setCurrentDetection(`Recognized: ${user.name} (${Math.round(confidenceScore * 100)}%)`);

      const studentId = user.studentId;

      // Check against REF to avoid duplicates in current session
      if (markedIdsRef.current.has(studentId)) {
        setCurrentDetection(`Already marked: ${user.name}`);
        setIsProcessing(false);
        return;
      }

      // CRITICAL FIX: Use REF for selectedEventId to ensure we send the current one
      const currentEventId = selectedEventIdRef.current;
      if (!currentEventId) {
        setCurrentDetection("Select an event first");
        setIsProcessing(false);
        return;
      }

      const currentTime = new Date();
      const event = eventsRef.current.find((e) => e.id === currentEventId);
      const eventStart = event ? new Date(event.startTime) : new Date();
      const isLate = isStudentLate(currentTime, eventStart);

      // Call Server API
      const logData = {
        studentId,
        eventId: currentEventId, // Use the fresh ID from ref
        confidence: confidenceScore,
        status: isLate ? "late" : "present",
        timestamp: currentTime.toISOString() 
      };

      const saveRes = await fetch(`${API_BASE_URL}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData)
      });

      if (!saveRes.ok) {
         console.error("Failed to save attendance");
         setIsProcessing(false);
         return;
      }

      // Update local UI
      if (!markedIdsRef.current.has(studentId)) {
        setMarkedIds((prev) => {
          const next = new Set(prev);
          next.add(studentId);
          markedIdsRef.current = next;
          return next;
        });

        setRecognizedStudents((prev) => {
          const idx = prev.findIndex((r) => r.user.studentId === studentId);
          const newEntry: RecognizedStudent = {
            user,
            confidence: confidenceScore,
            timestamp: currentTime,
            isLate,
          };
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = newEntry;
            return copy;
          }
          return [newEntry, ...prev];
        });
      }

      setIsProcessing(false);
    } catch (err) {
      console.error("detect error:", err);
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  const currentEvent = events.find(e => e.id === selectedEventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onClose && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Mark Attendance</h2>
            <p className="text-muted-foreground">Automatic face recognition</p>
          </div>
          <Button onClick={handleClose} variant="ghost" size="icon">
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Select Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Events</AlertTitle>
              <AlertDescription>Create an event first</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-select">Choose an event</Label>
                <Select value={selectedEventId} onValueChange={(v) => setSelectedEventId(v)}>
                  <SelectTrigger id="event-select">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Status Display */}
              {currentEvent && (
                <div className="p-4 bg-muted/50 rounded-lg text-sm border space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Status:</span>
                        {activeEvent?.id === currentEvent.id ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active System Event</Badge>
                        ) : (
                            <Badge variant="outline">Inactive</Badge>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> Time:
                        </span>
                        <span>{new Date(currentEvent.startTime).toLocaleString()}</span>
                    </div>

                    {currentEvent.description && (
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground font-medium">Description:</span>
                            <span>{currentEvent.description}</span>
                        </div>
                    )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!modelsLoaded && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <span>Loading face recognition models...</span>
              <span>{loadingProgress}%</span>
            </div>
            <Progress value={loadingProgress} />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {users.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Trained Students</AlertTitle>
          <AlertDescription>Add and train students in the admin panel</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanFace className="w-5 h-5" />
                Camera Feed
              </CardTitle>
              <CardDescription>Position students in front of the camera</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                {isCapturing ? (
                  <>
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    
                    {/* Detection Overlay */}
                    {currentDetection && (
                      <div className="absolute top-4 left-4 right-4 bg-black/75 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm animate-in fade-in slide-in-from-top-1">
                        {currentDetection}
                      </div>
                    )}

                    {/* Low Light Warning */}
                    {isLowLight && (
                      <div className="absolute top-16 left-4 bg-yellow-500/90 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Sun className="w-3 h-3" />
                        Low Light
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute bottom-4 right-4">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <Camera className="w-12 h-12 opacity-50" />
                    <p className="text-sm opacity-75">Camera not active</p>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <Button
                onClick={() => {
                  if (isCapturing) stopCamera();
                  else startCamera();
                }}
                className="w-full gap-2"
                disabled={!modelsLoaded || !selectedEventId}
              >
                {isCapturing ? "Stop Camera" : "Start Camera"}
                <Camera className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Present Today
              </CardTitle>
              <CardDescription>{recognizedStudents.length} students marked</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingAttendance ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : recognizedStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>No students marked yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {recognizedStudents.map((rs, idx) => (
                    <div key={rs.user.studentId} className="flex items-start gap-3 p-3 bg-accent rounded-lg border">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">
                        {rs.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{rs.user.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{rs.user.studentId}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(rs.confidence * 100)}%
                          </Badge>
                          {rs.isLate && (
                            <Badge className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Late</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{rs.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}