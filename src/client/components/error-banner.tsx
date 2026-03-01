import { useEffect } from "preact/hooks";
import { useApp } from "../context";

export function ErrorBanner() {
  const { error, setError } = useApp();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error, setError]);

  if (!error) return null;

  return <div class="error-banner" role="alert">{error}</div>;
}
