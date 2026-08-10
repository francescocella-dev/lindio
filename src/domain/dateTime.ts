function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function isValidDateTime(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function toLocalDateTimeInputValue(value: unknown): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes())
  ].join("");
}

export function normalizeLocalDateTime(value: unknown, fallback: string): string {
  if (!value) return fallback;

  if (typeof value === "string" && value.length === 16 && isValidDateTime(value)) {
    return `${value}:00`;
  }

  return isValidDateTime(value) ? String(value) : fallback;
}

export function toDatabaseDateTime(value: unknown): string | null {
  if (!value) return null;

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
