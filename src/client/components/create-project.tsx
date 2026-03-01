import { useState } from "preact/hooks";
import { X } from "lucide-preact";
import { useApp } from "../context";
import type { ProjectStatus, Priority } from "../types";

const STATUSES: ProjectStatus[] = ["backlog", "planned", "in_progress", "completed"];
const PRIORITIES: Priority[] = ["none", "urgent", "high", "medium", "low"];

export function CreateProject({ onClose }: { onClose: () => void }) {
  const { addProject, setError } = useApp();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planned");
  const [priority, setPriority] = useState<Priority>("none");
  const [lead, setLead] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await addProject({
        name: name.trim(),
        status,
        priority,
        lead: lead.trim(),
        target_date: targetDate,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div class="create-form-bar">
      <div class="create-form-header">
        <span class="create-form-title">New Project</span>
        <button class="btn btn-sm" onClick={onClose} aria-label="Cancel">
          <X size={14} />
        </button>
      </div>
      <div class="create-form-grid">
        <div class="create-form-field create-form-field-wide">
          <label>Project name</label>
          <input
            type="text"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Project name"
            autoFocus
            aria-label="Project name"
          />
        </div>
        <div class="create-form-field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as ProjectStatus)} aria-label="Status">
            {STATUSES.map((s) => <option key={s} value={s}>{s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div class="create-form-field">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority((e.target as HTMLSelectElement).value as Priority)} aria-label="Priority">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p === "none" ? "No priority" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div class="create-form-field">
          <label>Lead</label>
          <input
            type="text"
            value={lead}
            onInput={(e) => setLead((e.target as HTMLInputElement).value)}
            placeholder="Lead name"
            aria-label="Lead"
          />
        </div>
        <div class="create-form-field">
          <label>Target date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate((e.target as HTMLInputElement).value)}
            aria-label="Target date"
          />
        </div>
      </div>
      <div class="create-form-actions">
        <button class="btn btn-primary" onClick={handleSubmit} disabled={!name.trim()} aria-label="Create project">
          Create Project
        </button>
      </div>
    </div>
  );
}
