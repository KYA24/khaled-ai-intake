export function focusTimeline(days = []) {
  if (!days.length) return days;
  const firstActive = days.findIndex((day) => Number(day.views) > 0 || Number(day.leads) > 0);
  if (firstActive <= 0) return days;
  const focused = days.slice(firstActive);
  focused.max = Math.max(...focused.flatMap((day) => [Number(day.views) || 0, Number(day.leads) || 0]), 1);
  return focused;
}

