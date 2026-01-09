import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  clearAuthUser,
  getStoredAuthUser,
  getStoredToken,
  logoutAndRedirect,
  saveAuthUser,
} from "../api/client";
import type { UserMe } from "../types";

type AuthStatus = "idle" | "loading" | "ready" | "error";

type AuthContextValue = {
  user: UserMe | null;
  status: AuthStatus;
  refreshMe: () => Promise<UserMe | null>;
  logout: (message?: string) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserMe | null>(() => getStoredAuthUser());
  const [status, setStatus] = useState<AuthStatus>("idle");

  const refreshMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      clearAuthUser();
      setStatus("idle");
      return null;
    }

    setStatus("loading");
    const storedUser = getStoredAuthUser();
    if (storedUser) {
      const nextUser: UserMe = { name: storedUser.name, email: storedUser.email };
      setUser(nextUser);
      saveAuthUser({ name: nextUser.name, email: nextUser.email });
      setStatus("ready");
      return nextUser;
    }

    setStatus("ready");
    return null;
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      if (user !== null) setUser(null);
      if (status !== "idle") setStatus("idle");
      return;
    }

    if (status === "idle") {
      refreshMe();
    }
  }, [refreshMe, status, user]);

  const logout = useCallback((message?: string) => {
    setUser(null);
    setStatus("idle");
    logoutAndRedirect(message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      refreshMe,
      logout,
    }),
    [refreshMe, logout, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
