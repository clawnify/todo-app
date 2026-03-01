import type { Priority } from "../types";

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  none: "#d1d5db",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No priority",
};

export function PriorityIcon({ priority, size = 14 }: { priority: Priority; size?: number }) {
  const color = PRIORITY_COLORS[priority] || "#d1d5db";
  const barWidth = size * 0.15;
  const gap = size * 0.07;
  const totalWidth = barWidth * 4 + gap * 3;
  const startX = (size - totalWidth) / 2;
  const baseY = size * 0.8;

  const heights = [0.25, 0.45, 0.65, 0.85];
  const activeBars = priority === "urgent" ? 4 : priority === "high" ? 3 : priority === "medium" ? 2 : priority === "low" ? 1 : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={PRIORITY_LABELS[priority]}>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={startX + i * (barWidth + gap)}
          y={baseY - h * size * 0.7}
          width={barWidth}
          height={h * size * 0.7}
          rx={0.5}
          fill={i < activeBars ? color : "#e5e7eb"}
        />
      ))}
    </svg>
  );
}

export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority] || priority;
}

export function priorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority] || "#d1d5db";
}
