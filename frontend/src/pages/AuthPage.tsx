import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../lib/routes";

type LocationState = { from?: string };

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<"signin" | "signup">(
    modeParam === "signup" ? "signup" : "signin",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    setMode(modeParam === "signup" ? "signup" : "signin");
  }, [modeParam]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setSuccess(null);
    setSearchParams(next === "signup" ? { mode: "signup" } : {});
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        await api.signup(username, password);
        switchMode("signin");
        setPassword("");
        setSuccess("Account created. Sign in to continue.");
      } else {
        const { token, user } = await api.signin(username, password);
        login(token, user);
        const state = location.state as LocationState | null;
        const from = state?.from;
        const dest =
          from && from !== ROUTES.auth && from.startsWith("/")
            ? from
            : ROUTES.dashboard;
        navigate(dest, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card panel panel-glow">
      <h1>{mode === "signup" ? "Create account" : "Welcome back"}</h1>
      <p className="muted">
        {mode === "signup"
          ? "Sign up to start trading perpetual futures."
          : "Sign in to access your dashboard and trading terminal."}
      </p>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
            minLength={4}
          />
        </label>

        {success && <p className="form-success">{success}</p>}
        {error && <p className="form-error">{error}</p>}
        {mode === "signup" && !error && !success && (
          <p className="form-hint">After signup you can sign in right away.</p>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "signup"
              ? "Sign up"
              : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => switchMode("signin")}>
              Sign in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button type="button" onClick={() => switchMode("signup")}>
              Create account
            </button>
          </>
        )}
      </p>

      <Link to={ROUTES.home} className="back-link">
        ← Back to home
      </Link>
    </section>
  );
}
