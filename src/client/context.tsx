import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type {
  View, Issue, Project, Label, Comment, Stats, PaginatedState,
  ProjectLookup, LabelRef, IssueStatus, Priority,
} from "./types";

export interface AppContextValue {
  view: View;
  setView: (v: View) => void;
  isAgent: boolean;
  stats: Stats;

  // Issues
  issues: Issue[];
  issuesPag: PaginatedState;
  setIssuesPage: (page: number) => void;
  issuesSearch: string;
  setIssuesSearch: (s: string) => void;
  addIssue: (data: { title: string; description?: string; status?: IssueStatus; priority?: Priority; project_id?: number | null; due_date?: string }) => Promise<void>;
  updateIssue: (id: number, data: Partial<Issue>) => Promise<void>;
  deleteIssue: (id: number) => Promise<void>;

  // Issue detail
  selectedIssue: Issue | null;
  selectIssue: (id: number | null) => Promise<void>;
  addComment: (issueId: number, content: string) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
  addIssueLabel: (issueId: number, labelId: number) => Promise<void>;
  removeIssueLabel: (issueId: number, labelId: number) => Promise<void>;

  // Projects
  projects: Project[];
  projectsPag: PaginatedState;
  setProjectsPage: (page: number) => void;
  addProject: (data: Partial<Project>) => Promise<void>;
  updateProject: (id: number, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;

  // Lookups
  projectLookup: ProjectLookup[];
  allLabels: Label[];

  loading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
}

export const AppContext = createContext<AppContextValue>(null!);

export function useApp() {
  return useContext(AppContext);
}
