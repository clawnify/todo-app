import type { LabelRef } from "../types";

export function LabelPill({ label }: { label: LabelRef }) {
  return (
    <span
      class="label-pill"
      style={{
        background: label.color + "18",
        color: label.color,
        borderColor: label.color + "40",
      }}
    >
      {label.name}
    </span>
  );
}
