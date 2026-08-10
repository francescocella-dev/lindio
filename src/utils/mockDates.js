export function toLocalDateTime(date) {
  const safeDate = date instanceof Date ? date : new Date(date);

  return (
    [
      safeDate.getFullYear(),
      String(safeDate.getMonth() + 1).padStart(2, "0"),
      String(safeDate.getDate()).padStart(2, "0")
    ].join("-") +
    `T${String(safeDate.getHours()).padStart(2, "0")}:${String(safeDate.getMinutes()).padStart(2, "0")}:00`
  );
}

export function toDateInputValue(date) {
  return toLocalDateTime(date).slice(0, 16);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateAt(daysFromToday, time) {
  const date = addDays(new Date(), daysFromToday);
  const [hours, minutes] = time.split(":").map(Number);

  date.setHours(hours, minutes, 0, 0);

  return toLocalDateTime(date);
}

export const mockDate = {
  todayAt: (time) => dateAt(0, time),
  tomorrowAt: (time) => dateAt(1, time),
  inDaysAt: (days, time) => dateAt(days, time)
};