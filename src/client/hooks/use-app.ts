import { useState, useCallback, useEffect } from "preact/hooks";
import { api } from "../api";
import type {
  View, Issue, Project, Label, Stats, PaginatedState,
  ProjectLookup, IssueStatus, Priority,
} from "../types";
import type { AppContextValue } from "../context";

export function useAppState(isAgent: boolean): AppContextValue {
  const [view, setView] = useState<View>("issues");
  const [stats, setStats] = useState<Stats>({ issues: 0, projects: 0, labels: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Issues
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesPag, setIssuesPag] = useState<PaginatedState>({ page: 1, limit: 50, total: 0 });
  const [issuesSearch, setIssuesSearch] = useState("");

  // Issue detail
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsPag, setProjectsPag] = useState<PaginatedState>({ page: 1, limit: 25, total: 0 });

  // Lookups
  const [projectLookup, setProjectLookup] = useState<ProjectLookup[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);

  // ── Fetch helpers ──

  const fetchStats = useCallback(async () => {
    const data = await api<Stats>("GET", "/api/stats");
    setStats(data);
  }, []);

  const fetchIssues = useCallback(async (pag: PaginatedState, search: string) => {
    const params = new URLSearchParams({
      page: String(pag.page),
      limit: String(pag.limit),
    });
    if (search) params.set("search", search);

    const data = await api<{ issues: Issue[]; total: number }>("GET", `/api/issues?${params}`);
    setIssues(data.issues);
    setIssuesPag((prev) => ({ ...prev, total: data.total }));
  }, []);

  const fetchProjects = useCallback(async (pag: PaginatedState) => {
    const params = new URLSearchParams({
      page: String(pag.page),
      limit: String(pag.limit),
    });

    const data = await api<{ projects: Project[]; total: number }>("GET", `/api/projects?${params}`);
    setProjects(data.projects);
    setProjectsPag((prev) => ({ ...prev, total: data.total }));
  }, []);

  const fetchLookups = useCallback(async () => {
    const [p, l] = await Promise.all([
      api<{ projects: ProjectLookup[] }>("GET", "/api/projects/all"),
      api<{ labels: Label[] }>("GET", "/api/labels/all"),
    ]);
    setProjectLookup(p.projects);
    setAllLabels(l.labels);
  }, []);

  // ── Initial load ──

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchStats(),
          fetchIssues(issuesPag, ""),
          fetchProjects(projectsPag),
          fetchLookups(),
        ]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refetch on pagination/search changes ──

  useEffect(() => {
    fetchIssues(issuesPag, issuesSearch).catch((err) => setError((err as Error).message));
  }, [issuesPag.page, issuesSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProjects(projectsPag).catch((err) => setError((err as Error).message));
  }, [projectsPag.page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Issues CRUD ──

  const setIssuesPage = useCallback((page: number) => {
    setIssuesPag((prev) => ({ ...prev, page }));
  }, []);

  const addIssue = useCallback(async (data: { title: string; description?: string; status?: IssueStatus; priority?: Priority; project_id?: number | null; due_date?: string }) => {
    await api("POST", "/api/issues", data);
    await fetchIssues(issuesPag, issuesSearch);
    await fetchStats();
  }, [issuesPag, issuesSearch, fetchIssues, fetchStats]);

  const updateIssue = useCallback(async (id: number, data: Partial<Issue>) => {
    await api("PUT", `/api/issues/${id}`, data);
    await fetchIssues(issuesPag, issuesSearch);
    // Refresh detail if open
    if (selectedIssue && selectedIssue.id === id) {
      const res = await api<{ issue: Issue }>("GET", `/api/issues/${id}`);
      setSelectedIssue(res.issue);
    }
    await fetchStats();
  }, [issuesPag, issuesSearch, selectedIssue, fetchIssues, fetchStats]);

  const deleteIssue = useCallback(async (id: number) => {
    await api("DELETE", `/api/issues/${id}`);
    if (selectedIssue && selectedIssue.id === id) {
      setSelectedIssue(null);
    }
    await fetchIssues(issuesPag, issuesSearch);
    await fetchStats();
  }, [issuesPag, issuesSearch, selectedIssue, fetchIssues, fetchStats]);

  // ── Issue detail ──

  const selectIssue = useCallback(async (id: number | null) => {
    if (id === null) {
      setSelectedIssue(null);
      return;
    }
    const res = await api<{ issue: Issue }>("GET", `/api/issues/${id}`);
    setSelectedIssue(res.issue);
  }, []);

  const addComment = useCallback(async (issueId: number, content: string) => {
    await api("POST", `/api/issues/${issueId}/comments`, { content });
    // Refresh detail
    const res = await api<{ issue: Issue }>("GET", `/api/issues/${issueId}`);
    setSelectedIssue(res.issue);
  }, []);

  const deleteComment = useCallback(async (commentId: number) => {
    await api("DELETE", `/api/comments/${commentId}`);
    if (selectedIssue) {
      const res = await api<{ issue: Issue }>("GET", `/api/issues/${selectedIssue.id}`);
      setSelectedIssue(res.issue);
    }
  }, [selectedIssue]);

  const addIssueLabel = useCallback(async (issueId: number, labelId: number) => {
    await api("POST", `/api/issues/${issueId}/labels`, { label_id: labelId });
    const res = await api<{ issue: Issue }>("GET", `/api/issues/${issueId}`);
    setSelectedIssue(res.issue);
    await fetchIssues(issuesPag, issuesSearch);
  }, [issuesPag, issuesSearch, fetchIssues]);

  const removeIssueLabel = useCallback(async (issueId: number, labelId: number) => {
    await api("DELETE", `/api/issues/${issueId}/labels/${labelId}`);
    const res = await api<{ issue: Issue }>("GET", `/api/issues/${issueId}`);
    setSelectedIssue(res.issue);
    await fetchIssues(issuesPag, issuesSearch);
  }, [issuesPag, issuesSearch, fetchIssues]);

  // ── Projects CRUD ──

  const setProjectsPage = useCallback((page: number) => {
    setProjectsPag((prev) => ({ ...prev, page }));
  }, []);

  const addProject = useCallback(async (data: Partial<Project>) => {
    await api("POST", "/api/projects", data);
    await fetchProjects(projectsPag);
    await Promise.all([fetchStats(), fetchLookups()]);
  }, [projectsPag, fetchProjects, fetchStats, fetchLookups]);

  const updateProject = useCallback(async (id: number, data: Partial<Project>) => {
    await api("PUT", `/api/projects/${id}`, data);
    await fetchProjects(projectsPag);
    await fetchLookups();
  }, [projectsPag, fetchProjects, fetchLookups]);

  const deleteProject = useCallback(async (id: number) => {
    await api("DELETE", `/api/projects/${id}`);
    await fetchProjects(projectsPag);
    await Promise.all([fetchStats(), fetchLookups()]);
  }, [projectsPag, fetchProjects, fetchStats, fetchLookups]);

  return {
    view, setView, isAgent, stats,
    issues, issuesPag, setIssuesPage, issuesSearch, setIssuesSearch,
    addIssue, updateIssue, deleteIssue,
    selectedIssue, selectIssue,
    addComment, deleteComment,
    addIssueLabel, removeIssueLabel,
    projects, projectsPag, setProjectsPage,
    addProject, updateProject, deleteProject,
    projectLookup, allLabels,
    loading, error, setError,
  };
}
