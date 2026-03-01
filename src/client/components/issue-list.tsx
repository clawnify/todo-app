import { useState, useRef, useCallback } from "preact/hooks";
import { Plus, Search } from "lucide-preact";
import { useApp } from "../context";
import { IssueRow } from "./issue-row";
import { StatusIcon, statusLabel } from "./status-icon";
import { Pagination } from "./pagination";
import { CreateIssue } from "./create-issue";
import type { IssueStatus } from "../types";

const STATUS_ORDER: IssueStatus[] = ["in_progress", "todo", "backlog", "done", "cancelled"];

export function IssueList() {
  const { issues, issuesPag, setIssuesPage, issuesSearch, setIssuesSearch, selectIssue, stats } = useApp();
  const [searchValue, setSearchValue] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<IssueStatus>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIssuesSearch(value), 300);
  }, [setIssuesSearch]);

  // Group issues by status
  const grouped = new Map<IssueStatus, typeof issues>();
  for (const s of STATUS_ORDER) {
    grouped.set(s, []);
  }
  for (const issue of issues) {
    const group = grouped.get(issue.status);
    if (group) group.push(issue);
    else grouped.set(issue.status, [issue]);
  }

  const toggleCollapse = (s: IssueStatus) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  return (
    <div class="issue-list-view">
      <div class="toolbar">
        <div class="toolbar-left">
          <h1>Issues</h1>
          <span class="toolbar-count">{stats.issues}</span>
        </div>
        <div class="toolbar-actions">
          <div class="search-box">
            <Search size={14} />
            <input
              class="search-input"
              type="text"
              placeholder="Search issues..."
              value={searchValue}
              onInput={(e) => handleSearch((e.target as HTMLInputElement).value)}
              aria-label="Search issues"
            />
          </div>
          <button class="btn btn-primary" onClick={() => setShowCreate(true)} aria-label="New issue">
            <Plus size={14} /> New Issue
          </button>
        </div>
      </div>

      {showCreate && <CreateIssue onClose={() => setShowCreate(false)} />}

      <div class="issue-groups">
        {STATUS_ORDER.map((status) => {
          const group = grouped.get(status) || [];
          if (group.length === 0 && issuesSearch) return null;

          return (
            <div key={status} class="issue-group">
              <button
                class="issue-group-header"
                onClick={() => toggleCollapse(status)}
                aria-label={`Toggle ${statusLabel(status)}`}
                aria-expanded={!collapsed.has(status)}
              >
                <StatusIcon status={status} />
                <span class="issue-group-label">{statusLabel(status)}</span>
                <span class="issue-group-count">{group.length}</span>
              </button>
              {!collapsed.has(status) && (
                <div class="issue-group-items">
                  {group.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} onClick={() => selectIssue(issue.id)} />
                  ))}
                  {group.length === 0 && (
                    <div class="empty-group">No issues</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Pagination pag={issuesPag} onPage={setIssuesPage} />
    </div>
  );
}
