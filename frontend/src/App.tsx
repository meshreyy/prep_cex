import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GuestRoute } from "./components/GuestRoute";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TradingPage } from "./pages/TradingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ROUTES } from "./lib/routes";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TradingPage />} />
            <Route path="trade" element={<Navigate to={ROUTES.home} replace />} />

            <Route
              path="auth"
              element={
                <GuestRoute>
                  <AuthPage />
                </GuestRoute>
              }
            />
            <Route path="login" element={<Navigate to={ROUTES.auth} replace />} />
            <Route
              path="signup"
              element={<Navigate to={`${ROUTES.auth}?mode=signup`} replace />}
            />

            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
