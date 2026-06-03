/** App route paths — keep in sync with App.tsx */
export const ROUTES = {
  home: "/",
  auth: "/auth",
  dashboard: "/dashboard",
  trade: "/trade",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
