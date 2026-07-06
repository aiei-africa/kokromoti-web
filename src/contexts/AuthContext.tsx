"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getStoredAuth, setStoredAuth, clearStoredAuth, type AuthUser } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) { setUser(stored.user); setToken(stored.token); }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.accessToken);
    setUser(res.user);
    setStoredAuth(res.accessToken, res.user);
    setModalOpen(false);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    await api.register({ email, password, fullName });
    // Registration doesn't gate anything — log straight in after, so
    // favouriting works immediately without a second manual step.
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearStoredAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, modalOpen, openModal: () => setModalOpen(true), closeModal: () => setModalOpen(false), login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
