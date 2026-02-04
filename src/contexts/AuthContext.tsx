import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthUser, LoginResponse, MeResponse } from "../types/auth";
import { api } from "../lib/api";
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        await fetchUser();
      }
      setLoading(false);
    };
    initAuth();
  }, []);
  const fetchUser = async () => {
    try {
      const data = await api<MeResponse>("/auth/me");
      if (data.status === "success" && data.data) {
        setUser(data.data.user);
        localStorage.setItem("user", JSON.stringify(data.data.user));
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      logout();
    }
  };
  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("https://hotlinedemo-csezc2dbbne0b9au.eastasia-01.azurewebsites.net/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data: LoginResponse = await res.json();
      if (data.status === "success" && data.data) {
        // Store tokens
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        // Fetch full user with permissions
        await fetchUser();
        return { success: true };
      }
      return { success: false, error: data.message || "Login failed" };
    } catch (err) {
      return { success: false, error: "Connection error. Is the server running?" };
    }
  };
  const logout = () => {
    // Call backend logout (optional - clears refresh token)
    api("/auth/logout", { method: "POST" }).catch(() => {});
    
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    if (user.permissions.isSuperAdmin) return true;
    if (user.permissions.permissions === "ALL") return true;
    
    const effectivePerms = user.permissions.effectivePermissions || [];
    return effectivePerms.includes(permission);
  };
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };
  const refreshUser = async () => {
    await fetchUser();
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
