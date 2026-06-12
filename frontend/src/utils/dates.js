// part: "d"=day number, "wd"=weekday, "m"=month index, "md"=month+day,
//       "y"=year, "dt"=full date, "t"=time, anything else=date+time
export function formatDateTime(dateStr, part = "b") {
  // Mongo timestamps include microseconds that JS Date can't parse — strip them.
  if (!dateStr) return "undefined";

  const cleanStr = dateStr.replace(/\.\d+$/, "");
  const date = new Date(cleanStr);

  const day = String(date.getDate());
  const weekday = date.toLocaleString("en-US", { weekday: "long" });
  const month = String(date.getMonth()); // or .toString()
  const year = String(date.getFullYear());

  const datePart = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (part === "d") return day;
  if (part === "wd") return weekday;
  if (part === "m") return month;
  if (part === "md") return month + " " + day;
  if (part === "y") return year;
  if (part === "dt") return datePart;
  if (part === "t") return timePart;

  return `${datePart}, ${timePart}`;
}

export function daySuffix(day) {
  const num = Number(day);
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${num}th`;
  if (lastDigit === 1) return `${num}st`;
  if (lastDigit === 2) return `${num}nd`;
  if (lastDigit === 3) return `${num}rd`;
  return `${num}th`;
}

export function to_utc(local_date) {
  return new Date(local_date).toISOString();
}

export function to_local(utcISOString) {
  if (!utcISOString) return "";
  const d = new Date(utcISOString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function to_ISOEndOfDay(input) {
  if (!input) return undefined;

  const date = new Date(input); // works for ISO or "YYYY-MM-DD"
  if (isNaN(date.getTime())) return undefined; // optional safety

  date.setHours(23, 59, 59, 999); // local 23:59:59.999
  return date.toISOString();
}

export function to_ISOStartOfDay(input) {
  if (!input) return undefined;

  const date = new Date(input);
  if (isNaN(date.getTime())) return undefined;

  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function getLastAndCurrentMonthRange() {
  const now = new Date();

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
  // Day 0 of next month resolves to the last day of the current month.
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const format = (d) => d.toISOString(); // Keep full ISO (includes time)

  const data = {
    start_date: format(startOfLastMonth),
    end_date: format(endOfCurrentMonth),
  };

  return data;
}
