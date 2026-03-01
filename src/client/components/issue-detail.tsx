import { useState } from "preact/hooks";
import { ArrowLeft, Trash2, Send, X } from "lucide-preact";
import { useApp } from "../context";
import { StatusIcon, statusLabel } from "./status-icon";
import { PriorityIcon, priorityLabel } from "./priority-icon";
import { LabelPill } from "./label-pill";
import type { IssueStatus, Priority } from "../types";

const STATUSES: IssueStatus[] = ["backlog", "todo", "in_progress", "done", "cancelled"];
const PRIORITIES: Priority[] = ["none", "urgent", "high", "medium", "low"];

export function IssueDetail() {
  const {
    selectedIssue: issue, selectIssue, updateIssue, deleteIssue,
    addComment, deleteComment, addIssueLabel, removeIssueLabel,
    projectLookup, allLabels, setError,
  } = useApp();

  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState<"title" | "description" | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!issue) return null;

  const handleSaveTitle = async () => {
    if (editTitle.trim()) {
      try { await updateIssue(issue.id, { title: editTitle.trim() }); } catch (e) { setError((e as Error).message); }
    }
    setEditing(null);
  };

  const handleSaveDesc = async () => {
    try { await updateIssue(issue.id, { description: editDesc }); } catch (e) { setError((e as Error).message); }
    setEditing(null);
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await addComment(issue.id, comment.trim());
      setComment("");
    } catch (e) { setError((e as Error).message); }
  };

  const handleDelete = async () => {
    try { await deleteIssue(issue.id); } catch (e) { setError((e as Error).message); }
  };

  const handleFieldChange = async (field: string, value: unknown) => {
    try { await updateIssue(issue.id, { [field]: value }); } catch (e) { setError((e as Error).message); }
  };

  const availableLabels = allLabels.filter((l) => !issue.labels.some((il) => il.id === l.id));

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div class="issue-detail">
      <div class="issue-detail-main">
        <div class="issue-detail-header">
          <button class="btn btn-sm" onClick={() => selectIssue(null)} aria-label="Back to issues">
            <ArrowLeft size={14} /> Back
          </button>
          <span class="issue-detail-identifier">{issue.identifier}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
            {confirmDelete ? (
              <span class="confirm-bar">
                Delete this issue?
                <button class="btn btn-sm btn-danger" onClick={handleDelete} aria-label="Confirm delete">Yes</button>
                <button class="btn btn-sm" onClick={() => setConfirmDelete(false)} aria-label="Cancel delete">No</button>
              </span>
            ) : (
              <button class="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)} aria-label="Delete issue">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        {editing === "title" ? (
          <input
            class="issue-detail-title-input"
            value={editTitle}
            onInput={(e) => setEditTitle((e.target as HTMLInputElement).value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditing(null); }}
            autoFocus
            aria-label="Edit title"
          />
        ) : (
          <h1
            class="issue-detail-title"
            onClick={() => { setEditTitle(issue.title); setEditing("title"); }}
            aria-label="Click to edit title"
          >
            {issue.title}
          </h1>
        )}

        {/* Description */}
        {editing === "description" ? (
          <div>
            <textarea
              class="issue-detail-desc-input"
              value={editDesc}
              onInput={(e) => setEditDesc((e.target as HTMLTextAreaElement).value)}
              rows={4}
              autoFocus
              aria-label="Edit description"
            />
            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              <button class="btn btn-sm btn-primary" onClick={handleSaveDesc} aria-label="Save description">Save</button>
              <button class="btn btn-sm" onClick={() => setEditing(null)} aria-label="Cancel edit">Cancel</button>
            </div>
          </div>
        ) : (
          <div
            class="issue-detail-desc"
            onClick={() => { setEditDesc(issue.description || ""); setEditing("description"); }}
            aria-label="Click to edit description"
          >
            {issue.description || "Add a description..."}
          </div>
        )}

        {/* Activity / Comments */}
        <div class="issue-detail-activity">
          <h3>Activity</h3>
          <div class="comments-list">
            {(issue.comments || []).map((c) => (
              <div key={c.id} class="comment">
                <div class="comment-header">
                  <span class="comment-date">{formatDate(c.created_at)}</span>
                  <button class="comment-delete" onClick={() => deleteComment(c.id)} aria-label="Delete comment">
                    <X size={12} />
                  </button>
                </div>
                <div class="comment-content">{c.content}</div>
              </div>
            ))}
          </div>
          <div class="comment-input">
            <input
              type="text"
              placeholder="Leave a comment..."
              value={comment}
              onInput={(e) => setComment((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
              aria-label="Add comment"
            />
            <button class="btn btn-sm btn-primary" onClick={handleComment} disabled={!comment.trim()} aria-label="Send comment">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div class="issue-detail-sidebar">
        <div class="detail-field">
          <label>Status</label>
          <select
            value={issue.status}
            onChange={(e) => handleFieldChange("status", (e.target as HTMLSelectElement).value)}
            aria-label="Issue status"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </div>

        <div class="detail-field">
          <label>Priority</label>
          <select
            value={issue.priority}
            onChange={(e) => handleFieldChange("priority", (e.target as HTMLSelectElement).value)}
            aria-label="Issue priority"
          >
            {PRIORITIES.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
          </select>
        </div>

        <div class="detail-field">
          <label>Project</label>
          <select
            value={issue.project_id || ""}
            onChange={(e) => {
              const val = (e.target as HTMLSelectElement).value;
              handleFieldChange("project_id", val ? parseInt(val, 10) : null);
            }}
            aria-label="Issue project"
          >
            <option value="">No project</option>
            {projectLookup.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </select>
        </div>

        <div class="detail-field">
          <label>Labels</label>
          <div class="detail-labels">
            {issue.labels.map((l) => (
              <span key={l.id} class="detail-label-item">
                <LabelPill label={l} />
                <button class="detail-label-remove" onClick={() => removeIssueLabel(issue.id, l.id)} aria-label={`Remove label ${l.name}`}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {availableLabels.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  const val = (e.target as HTMLSelectElement).value;
                  if (val) addIssueLabel(issue.id, parseInt(val, 10));
                }}
                aria-label="Add label"
                class="detail-label-add"
              >
                <option value="">+ Add label</option>
                {availableLabels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <div class="detail-field">
          <label>Due date</label>
          <input
            type="date"
            value={issue.due_date || ""}
            onChange={(e) => handleFieldChange("due_date", (e.target as HTMLInputElement).value)}
            aria-label="Due date"
          />
        </div>

        <div class="detail-field">
          <label>Created</label>
          <span class="detail-value">{formatDate(issue.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
