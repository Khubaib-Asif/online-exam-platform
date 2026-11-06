/**
 * Converts a Date object
 * strictly preserving local browser timezone without UTC shifting.
 */
export const toLocalDatetimeInput = (dateInput?: Date | string | null): string => {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Calculates the exact end time string 
 * based on a local start time string 
 */
export const calculateClosesAt = (startTimeStr: string, durationMins: number): string => {
  if (!startTimeStr) return "";
  const start = new Date(startTimeStr);
  if (isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + durationMins * 60 * 1000);
  return toLocalDatetimeInput(end);
};

/**
 * Converts a local datetime string 
 * into a standard ISO 8601 UTC string for backend payloads.
 */
export const fromLocalDatetimeInput = (inputStr?: string | null): string | undefined => {
  if (!inputStr) return undefined;
  const d = new Date(inputStr);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
};

/**
 * Formats an ISO datetime string into human-readable format
 */
export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};


export const getTimeGreeting = (): string => {
  const currentHour = new Date().getHours();
  if (currentHour >= 5 && currentHour < 12) {
    return "Good morning";
  } else if (currentHour >= 12 && currentHour < 17) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
};
