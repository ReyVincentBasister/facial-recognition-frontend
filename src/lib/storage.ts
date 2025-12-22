// Client-side storage utilities for face attendance system

export interface User {
  id: string
  name: string
  email: string
  studentId: string
  faceDescriptor: number[] | null
  createdAt: string
  updatedAt: string
}

export interface AttendanceLog {
  id: string
  userId: string
  userName: string
  studentId: string
  timestamp: string
  confidence: number
  status: "present" | "late" | "absent"
   eventId: string 
}

export interface Event {
  id: string
  name: string
  startTime: string
  description: string
  createdAt: string
  updatedAt: string
}

// Storage keys
const USERS_KEY = "face_attendance_users"
const ATTENDANCE_KEY = "face_attendance_logs"
const EVENTS_KEY = "face_attendance_events"
const ACTIVE_EVENT_KEY = "face_attendance_active_event"

// User operations
export function getUsers(): User[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(USERS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): User {
  const users = getUsers()
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  users.push(newUser)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return newUser
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = getUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return null

  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return users[index]
}

export function deleteUser(id: string): boolean {
  const users = getUsers()
  const filtered = users.filter((u) => u.id !== id)
  if (filtered.length === users.length) return false
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered))
  return true
}

export function getUserById(id: string): User | null {
  const users = getUsers()
  return users.find((u) => u.id === id) || null
}

// Attendance operations
export function getAttendanceLogs(): AttendanceLog[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(ATTENDANCE_KEY)
  return data ? JSON.parse(data) : []
}

export function saveAttendanceLog(
  log: Omit<AttendanceLog, "id" | "timestamp">
): AttendanceLog {
  const logs = getAttendanceLogs()

  // prevent duplicates for the same event
  const alreadyLogged = logs.find(
    (l) => l.userId === log.userId && l.eventId === log.eventId
  )
  if (alreadyLogged) return alreadyLogged

  const newLog: AttendanceLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }

  logs.push(newLog)
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(logs))
  return newLog
}


export function getAttendanceByDateRange(startDate: Date, endDate: Date): AttendanceLog[] {
  const logs = getAttendanceLogs()
  return logs.filter((log) => {
    const logDate = new Date(log.timestamp)
    return logDate >= startDate && logDate <= endDate
  })
}

export function getAttendanceByUser(userId: string): AttendanceLog[] {
  const logs = getAttendanceLogs()
  return logs.filter((log) => log.userId === userId)
}

// Event operations
export function getEvents(): Event[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(EVENTS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveEvent(event: Omit<Event, "id" | "createdAt" | "updatedAt">): Event {
  const events = getEvents()
  const newEvent: Event = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  events.push(newEvent)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return newEvent
}

export function updateEvent(id: string, updates: Partial<Event>): Event | null {
  const events = getEvents()
  const index = events.findIndex((e) => e.id === id)
  if (index === -1) return null

  events[index] = {
    ...events[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return events[index]
}

export function deleteEvent(id: string): boolean {
  const events = getEvents()
  const filtered = events.filter((e) => e.id !== id)
  if (filtered.length === events.length) return false
  localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered))
  // Clear active event if it was deleted
  if (getActiveEvent()?.id === id) {
    setActiveEvent(null)
  }
  return true
}

export function getEventById(id: string): Event | null {
  const events = getEvents()
  return events.find((e) => e.id === id) || null
}

export function setActiveEvent(eventId: string | null): void {
  if (eventId === null) {
    localStorage.removeItem(ACTIVE_EVENT_KEY)
  } else {
    localStorage.setItem(ACTIVE_EVENT_KEY, eventId)
  }
}

export function getActiveEvent(): Event | null {
  if (typeof window === "undefined") return null
  const eventId = localStorage.getItem(ACTIVE_EVENT_KEY)
  if (!eventId) return null
  return getEventById(eventId)
}

export function clearAllData(): void {
  localStorage.removeItem(USERS_KEY)
  localStorage.removeItem(ATTENDANCE_KEY)
  localStorage.removeItem(EVENTS_KEY)
  localStorage.removeItem(ACTIVE_EVENT_KEY)
}
