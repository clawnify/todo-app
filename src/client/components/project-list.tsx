import { useState } from "preact/hooks";
import { Plus, Trash2 } from "lucide-preact";
import { useApp } from "../context";
import { PriorityIcon, priorityLabel } from "./priority-icon";
import { Pagination } from "./pagination";
import { CreateProject } from "./create-project";
import type { ProjectStatus, Priority } from "../types";

const PROJECT_STATUSES: ProjectStatus[] = ["backlog", "planned", "in_progress", "completed", "cancelled"];
const PRIORITIES: Priority[] = ["none", "urgent", "high", "medium", "low"];

function projectStatusLabel(s: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    backlog: "Backlog",
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[s] || s;
}

export function ProjectList() {
  const { projects, projectsPag, setProjectsPage, updateProject, deleteProject, stats, setError } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const handleDelete = async (id: number) => {
    try { await deleteProject(id); } catch (e) { setError((e as Error).message); }
    setConfirmId(null);
  };

  const handleFieldChange = async (id: number, field: string, value: unknown) => {
    try { await updateProject(id, { [field]: value }); } catch (e) { setError((e as Error).message); }
  };

  const handleSaveName = async (id: number) => {
    if (editName.trim()) {
      try { await updateProject(id, { name: editName.trim() }); } catch (e) { setError((e as Error).message); }
    }
    setEditingId(null);
  };

  return (
    <div class="project-list-view">
      <div class="toolbar">
        <div class="toolbar-left">
          <h1>Projects</h1>
          <span class="toolbar-count">{stats.projects}</span>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-primary" onClick={() => setShowCreate(true)} aria-label="New project">
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {showCreate && <CreateProject onClose={() => setShowCreate(false)} />}

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Priority</th>
                <th>Lead</th>
                <th>Target Date</th>
                <th>Status</th>
                <th>Progress</th>
                <th style={{ width: "60px" }}></th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr><td colspan={7} class="empty-text">No projects yet</td></tr>
              )}
              {projects.map((p) => {
                const progress = p.issue_count ? Math.round(((p.done_count || 0) / p.issue_count) * 100) : 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <div class="project-name">
                        <span class="project-icon">{p.icon}</span>
                        {editingId === p.id ? (
                          <input
                            class="inline-edit"
                            value={editName}
                            onInput={(e) => setEditName((e.target as HTMLInputElement).value)}
                            onBlur={() => handleSaveName(p.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(p.id); if (e.key === "Escape") setEditingId(null); }}
                            autoFocus
                            aria-label="Edit project name"
                          />
                        ) : (
                          <span
                            class="project-name-text"
                            onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                            aria-label="Click to edit name"
                          >
                            {p.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        class="inline-select"
                        value={p.priority}
                        onChange={(e) => handleFieldChange(p.id, "priority", (e.target as HTMLSelectElement).value)}
                        aria-label="Project priority"
                      >
                        {PRIORITIES.map((pr) => <option key={pr} value={pr}>{priorityLabel(pr)}</option>)}
                      </select>
                    </td>
                    <td class="muted">{p.lead || "No lead"}</td>
                    <td class="muted">{p.target_date || "—"}</td>
                    <td>
                      <select
                        class="inline-select"
                        value={p.status}
                        onChange={(e) => handleFieldChange(p.id, "status", (e.target as HTMLSelectElement).value)}
                        aria-label="Project status"
                      >
                        {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{projectStatusLabel(s)}</option>)}
                      </select>
                    </td>
                    <td>
                      <div class="progress-cell">
                        <div class="progress-bar">
                          <div class="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span class="progress-text">{progress}%</span>
                      </div>
                    </td>
                    <td>
                      <div class="actions-cell">
                        {confirmId === p.id ? (
                          <span class="confirm-bar">
                            <button class="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)} aria-label="Confirm delete">Yes</button>
                            <button class="btn btn-sm" onClick={() => setConfirmId(null)} aria-label="Cancel delete">No</button>
                          </span>
                        ) : (
                          <button class="btn btn-sm btn-danger" onClick={() => setConfirmId(p.id)} aria-label="Delete project">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination pag={projectsPag} onPage={setProjectsPage} />
      </div>
    </div>
  );
}
