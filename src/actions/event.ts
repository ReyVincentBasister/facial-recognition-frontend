"use server";

const API_BASE_URL = "http://127.0.0.1:8080/api/events";

export type Event = {
  id: string;
  name: string;
  startTime: string;
  description?: string;
};

// GET all events
export async function getEvents(): Promise<Event[]> {
  const response = await fetch(API_BASE_URL, { cache: "no-store" });
  if (!response.ok) return [];
  return response.json();
}

// GET active event
export async function getActiveEvent(): Promise<Event | null> {
  const response = await fetch(`${API_BASE_URL}/active`, { cache: "no-store" });
  if (response.status === 204) return null; // No Content
  if (!response.ok) return null;
  return response.json();
}

// POST create event
export async function createEvent(data: { name: string; startTime: Date; description?: string }) {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// POST set active event
export async function setActiveEvent(eventId: string) {
  await fetch(`${API_BASE_URL}/active/${eventId}`, {
    method: "POST",
  });
}

// DELETE event
export async function deleteEvent(id: string) {
  await fetch(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
  });
}