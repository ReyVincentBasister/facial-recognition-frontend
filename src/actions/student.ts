"use server";

import { db } from "@/db";
import { student } from "@/db/schema";
import { eq } from "drizzle-orm";

// At the top of AttendanceCamera.tsx
export interface User {
  id: string
  name: string
  studentId: string
  email: string
  faceDescriptor: number[] | null
}

/* ===========================
   📌 GET ALL STUDENTS
=========================== */
export async function getStudents() {
  return await db.select().from(student);
}

/* ===========================
   📌 CREATE STUDENT
=========================== */
export async function createStudent(data: {
  name: string;
  studentId: string;
  email: string;
  faceDescriptor?: number[] | null;
}) {
  const id = crypto.randomUUID();

  await db.insert(student).values({
    id,
    name: data.name,
    studentId: data.studentId,
    email: data.email,
    faceDescriptor: data.faceDescriptor
      ? JSON.stringify(data.faceDescriptor)
      : null,
  });

  return getStudentById(id);
}

/* ===========================
   📌 UPDATE STUDENT
=========================== */
export async function updateStudent(
  id: string,
  updates: Partial<{
    name: string;
    studentId: string;
    email: string;
    faceDescriptor: number[] | null;
  }>
) {
  await db
    .update(student)
    .set({
      ...updates,
      faceDescriptor: updates.faceDescriptor
        ? JSON.stringify(updates.faceDescriptor)
        : undefined,
    })
    .where(eq(student.id, id));

  return getStudentById(id);
}

/* ===========================
   📌 DELETE STUDENT
=========================== */
export async function deleteStudent(id: string) {
  await db.delete(student).where(eq(student.id, id));
  return true;
}

/* ===========================
   📌 GET STUDENT BY ID
=========================== */
export async function getStudentById(id: string) {
  const res = await db.select().from(student).where(eq(student.id, id));
  return res[0] || null;
}
