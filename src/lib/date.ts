export function getDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not format date key.");
  }

  return `${year}-${month}-${day}`;
}

export function daysBetweenDateKeys(startDateKey: string, endDateKey: string) {
  const start = Date.parse(`${startDateKey}T00:00:00.000Z`);
  const end = Date.parse(`${endDateKey}T00:00:00.000Z`);

  return Math.floor((end - start) / 86_400_000);
}
