import { StatusIcon } from "./status-icon";
import { PriorityIcon } from "./priority-icon";
import { LabelPill } from "./label-pill";
import type { Issue } from "../types";

interface IssueRowProps {
  issue: Issue;
  onClick: () => void;
}

export function IssueRow({ issue, onClick }: IssueRowProps) {
  return (
    <button class="issue-row" onClick={onClick} aria-label={`View issue ${issue.identifier}`}>
      <div class="issue-row-priority">
        <PriorityIcon priority={issue.priority} />
      </div>
      <div class="issue-row-id">{issue.identifier}</div>
      <StatusIcon status={issue.status} />
      <div class="issue-row-title">{issue.title}</div>
      <div class="issue-row-labels">
        {issue.labels.map((l) => (
          <LabelPill key={l.id} label={l} />
        ))}
      </div>
      <div class="issue-row-meta">
        {issue.project_name && (
          <span class="issue-row-project">
            <span class="issue-row-project-icon">{issue.project_icon || "📋"}</span>
            {issue.project_name}
          </span>
        )}
        {issue.due_date && (
          <span class="issue-row-date">{issue.due_date}</span>
        )}
      </div>
    </button>
  );
}
