"use server";

import { db } from "@/db";
import { attendanceLog } from "@/db/schema";
import { eq,and } from "drizzle-orm";

/* ===========================
   📌 GET ALL LOGS
=========================== */
export async function getAttendanceLogs() {
  return await db.select().from(attendanceLog);
}

/* ===========================
   📌 SAVE WITH DUPLICATE CHECK
=========================== */
export async function saveAttendanceLog(data: {
  studentId: string;
  eventId: string;
  confidence: number;
  status: "present" | "late" | "absent";
}) {
  // Prevent duplicate attendance for the same event
await db
  .select()
  .from(attendanceLog)
  .where(
    and(
      eq(attendanceLog.studentId, data.studentId),
      eq(attendanceLog.eventId, data.eventId)
    )
  );
const existing = await db
  .select()
  .from(attendanceLog)
  .where(
    and(
      eq(attendanceLog.studentId, data.studentId),
      eq(attendanceLog.eventId, data.eventId)
    )
  );
  if (existing.length > 0) return existing[0];

  const id = crypto.randomUUID();

  await db.insert(attendanceLog).values({
    id,
    studentId: data.studentId,
    eventId: data.eventId,
    confidence: String(data.confidence),
    status: data.status,
  });

  return getAttendanceLogById(id);
}


/* ===========================
   📌 GET PRESENT TODAY BY EVENT
=========================== */
export async function getAttendanceByEvent(eventId: string) {
  const logs = await db
    .select()
    .from(attendanceLog)
    .where(eq(attendanceLog.eventId, eventId));

  return logs.map((log) => ({
    studentId: log.studentId,
    confidence: parseFloat(log.confidence),
    status: log.status,
    timestamp: log.timestamp,
  }));
}
/* ===========================
   📌 GET BY ID
=========================== */
export async function getAttendanceLogById(id: string) {
  const rows = await db
    .select()
    .from(attendanceLog)
    .where(eq(attendanceLog.id, id));

  return rows[0] || null;
}

/* ===========================
   📌 GET BY DATE RANGE
=========================== */
export async function getAttendanceByDateRange(start: Date, end: Date) {
  const logs = await getAttendanceLogs();
  return logs.filter((log) => {
    const ts = new Date(log.timestamp);
    return ts >= start && ts <= end;
  });
}

/* ===========================
   📌 GET BY STUDENT
=========================== */
export async function getAttendanceByStudent(studentId: string) {
  return await db
    .select()
    .from(attendanceLog)
    .where(eq(attendanceLog.studentId, studentId));
}
