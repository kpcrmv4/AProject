import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { th } from "date-fns/locale";

export function formatDate(date: string | Date): string {
  return format(new Date(date), "d MMM yyyy", { locale: th });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "d MMM yyyy HH:mm", { locale: th });
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH:mm:ss.SSS");
}

export function formatTimeShort(date: string | Date): string {
  return format(new Date(date), "HH:mm:ss");
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: th });
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function calculateElapsed(start: string, end: string): number {
  return differenceInSeconds(new Date(end), new Date(start));
}

export function formatRaceNumber(num: number, format: string = "000"): string {
  return String(num).padStart(format.length, "0");
}

export function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("th-TH")}`;
}

export function generateAccessCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
