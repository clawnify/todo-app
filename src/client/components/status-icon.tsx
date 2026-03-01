import type { IssueStatus } from "../types";

const STATUS_COLORS: Record<IssueStatus, string> = {
  backlog: "#9ca3af",
  todo: "#f2994a",
  in_progress: "#2563eb",
  done: "#16a34a",
  cancelled: "#9ca3af",
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export function StatusIcon({ status, size = 14 }: { status: IssueStatus; size?: number }) {
  const color = STATUS_COLORS[status] || "#9ca3af";
  const half = size / 2;
  const r = half - 1.5;

  if (status === "done") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-label={STATUS_LABELS[status]}>
        <circle cx={half} cy={half} r={r} fill={color} />
        <polyline
          points={`${size * 0.3},${half} ${size * 0.45},${size * 0.65} ${size * 0.72},${size * 0.35}`}
          fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        />
      </svg>
    );
  }

  if (status === "cancelled") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-label={STATUS_LABELS[status]}>
        <circle cx={half} cy={half} r={r} stroke={color} stroke-width="1.5" />
        <line x1={size * 0.35} y1={size * 0.35} x2={size * 0.65} y2={size * 0.65} stroke={color} stroke-width="1.5" stroke-linecap="round" />
      </svg>
    );
  }

  if (status === "in_progress") {
    // Half-filled circle
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-label={STATUS_LABELS[status]}>
        <circle cx={half} cy={half} r={r} stroke={color} stroke-width="1.5" />
        <path d={`M ${half} ${half - r} A ${r} ${r} 0 0 1 ${half} ${half + r} Z`} fill={color} />
      </svg>
    );
  }

  // backlog = dashed circle, todo = solid outline
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-label={STATUS_LABELS[status]}>
      <circle
        cx={half} cy={half} r={r}
        stroke={color} stroke-width="1.5"
        stroke-dasharray={status === "backlog" ? "2.5 2.5" : "none"}
      />
    </svg>
  );
}

export function statusLabel(status: IssueStatus): string {
  return STATUS_LABELS[status] || status;
}

export function statusColor(status: IssueStatus): string {
  return STATUS_COLORS[status] || "#9ca3af";
}
