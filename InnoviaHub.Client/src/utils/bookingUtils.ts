import type {Booking} from "../services/bookingApiService";

// Samma öppettider som backend (OpeningHours i appsettings.json)
export const OPENING_MINUTES = 8 * 60;
export const CLOSING_MINUTES = 18 * 60;
export const STEP_MINUTES = 15;
const DEFAULT_LENGTH_MINUTES = 60;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function toDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

export function generateTimeSlots(
  start: number,
  end: number,
  intervalMinutes: number,
): string[] {
  const slots: string[] = [];

  for (let i = start; i <= end; i += intervalMinutes) {
    slots.push(minutesToTime(i));
  }

  return slots;
}

export function isPastTime(date: string, time: string) {
  return toDateTime(date, time) < new Date();
}

// Starttider som inte har passerat
export function availableStartTimes(slots: string[], date: string): string[] {
  return slots.filter((time) => !isPastTime(date, time));
}

// Föreslagen sluttid: en timme efter starten, men aldrig efter stängning
export function defaultEndTime(startTime: string): string {
  return minutesToTime(Math.min(toMinutes(startTime) + DEFAULT_LENGTH_MINUTES, CLOSING_MINUTES));
}

// "1 h 30 min", "45 min", "2 h"
export function formatDuration(startTime: string, endTime: string): string {
  const total = toMinutes(endTime) - toMinutes(startTime);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

// Datum som "YYYY-MM-DD" i lokal tid
export function toDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + days);
  return toDateString(result);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("sv-SE", {hour: "2-digit", minute: "2-digit"});
}

export function formatLongDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function bookingOverlapsSelection(
  booking: Booking,
  resourceId: string,
  date: string,
  startTime: string,
  endTime: string,
) {
  if (booking.resource.id !== resourceId || booking.isCancelled) {
    return false;
  }

  return (
    new Date(booking.startTime) < toDateTime(date, endTime) &&
    new Date(booking.endTime) > toDateTime(date, startTime)
  );
}
