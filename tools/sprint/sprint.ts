const ANCHOR_SPRINT = 140;
const ANCHOR_START = new Date(2026, 0, 8);
const MS_PER_DAY = 86_400_000;

export type Sprint = {
  number: number;
  start: Date;
  end: Date;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sprintForNumber(number: number): Sprint {
  const offsetDays = (number - ANCHOR_SPRINT) * 14;
  const start = new Date(ANCHOR_START);
  start.setDate(start.getDate() + offsetDays);

  const end = new Date(start);
  end.setDate(end.getDate() + 13);

  return { number, start, end };
}

export function sprintNumberForDate(date: Date): number {
  const daysSinceAnchor = Math.floor(
    (startOfDay(date).getTime() - startOfDay(ANCHOR_START).getTime()) /
      MS_PER_DAY
  );
  return ANCHOR_SPRINT + Math.floor(daysSinceAnchor / 14);
}

export function currentSprintNumber(): number {
  return sprintNumberForDate(new Date());
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDateLocal(arg: string): Date | undefined {
  const match = ISO_DATE.exec(arg);
  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

const WEEKDAY_WIDTH = 9;
const DATE_LINE_PREFIX_WIDTH = 10;

export function formatDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const rest = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return `${weekday.padEnd(WEEKDAY_WIDTH)} ${rest}`;
}

function formatDateLine(kind: "Start" | "End", date: Date): string {
  return `• ${kind}: `.padEnd(DATE_LINE_PREFIX_WIDTH) + formatDate(date);
}

const BLOCK_LABEL_WIDTH = 10;

export function formatSprintBlock(label: string | undefined, sprint: Sprint): string {
  const header = label
    ? `${label}: `.padEnd(BLOCK_LABEL_WIDTH) + `Sprint ${sprint.number}`
    : `Sprint ${sprint.number}`;
  return [
    header,
    formatDateLine("Start", sprint.start),
    formatDateLine("End", sprint.end)
  ].join("\n");
}
