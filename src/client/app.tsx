import { useEffect, useMemo } from "preact/hooks";
import { AppContext } from "./context";
import { useAppState } from "./hooks/use-app";
import { Sidebar } from "./components/sidebar";
import { IssueList } from "./components/issue-list";
import { IssueDetail } from "./components/issue-detail";
import { ProjectList } from "./components/project-list";
import { ErrorBanner } from "./components/error-banner";

export function App() {
  const isAgent = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("agent") || params.get("mode") === "agent";
  }, []);

  useEffect(() => {
    if (isAgent) {
      document.documentElement.setAttribute("data-agent", "");
    }
  }, [isAgent]);

  const appState = useAppState(isAgent);

  const renderMain = () => {
    if (appState.selectedIssue) return <IssueDetail />;
    if (appState.view === "projects") return <ProjectList />;
    return <IssueList />;
  };

  return (
    <AppContext.Provider value={appState}>
      <div class="layout">
        <Sidebar />
        <main class="main-content">
          {appState.loading ? (
            <div class="loading-text">Loading...</div>
          ) : (
            renderMain()
          )}
        </main>
      </div>
      <ErrorBanner />
    </AppContext.Provider>
  );
}
