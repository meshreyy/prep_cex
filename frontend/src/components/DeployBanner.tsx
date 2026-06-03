import { isApiConfigured } from "../lib/api";

export function DeployBanner() {
  if (import.meta.env.DEV || isApiConfigured()) return null;

  return (
    <div className="deploy-banner" role="alert">
      API not configured: set <code>VITE_API_URL</code> to your backend URL
      before deploying.
    </div>
  );
}
