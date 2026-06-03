import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, Balance } from "../lib/api";

const STORAGE_KEY = "perp_auth";

type StoredAuth = {
  token: string;
  user: AuthUser;
  balance?: Balance;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  balance: Balance | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setBalance: (balance: Balance) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function writeStoredAuth(next: StoredAuth | null) {
  if (next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(readStoredAuth);

  const login = useCallback((token: string, user: AuthUser) => {
    setStored((prev) => {
      const next: StoredAuth = {
        token,
        user,
        balance: prev?.user.id === user.id ? prev.balance : undefined,
      };
      writeStoredAuth(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    writeStoredAuth(null);
    setStored(null);
  }, []);

  const setBalance = useCallback((balance: Balance) => {
    setStored((prev) => {
      if (!prev) return prev;
      const next = { ...prev, balance };
      writeStoredAuth(next);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: stored?.user ?? null,
      token: stored?.token ?? null,
      balance: stored?.balance ?? null,
      isAuthenticated: Boolean(stored?.token),
      login,
      logout,
      setBalance,
    }),
    [stored, login, logout, setBalance],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
