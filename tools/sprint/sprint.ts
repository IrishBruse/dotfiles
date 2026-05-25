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

export function currentSprintNumber(today = new Date()): number {
  const daysSinceAnchor = Math.floor(
    (startOfDay(today).getTime() - startOfDay(ANCHOR_START).getTime()) /
      MS_PER_DAY
  );
  return ANCHOR_SPRINT + Math.floor(daysSinceAnchor / 14);
}

export function formatDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const rest = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return `${weekday} ${rest}`;
}

export function formatSprintBlock(label: string, sprint: Sprint): string {
  return [
    `${label}: Sprint ${sprint.number}`,
    `• Start: ${formatDate(sprint.start)}`,
    `• End: ${formatDate(sprint.end)}`
  ].join("\n");
}
