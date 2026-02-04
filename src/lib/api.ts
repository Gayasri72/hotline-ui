// API utility with auto token refresh
// Use environment variable for production, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || "https://hotlinedemo-csezc2dbbne0b9au.eastasia-01.azurewebsites.net/api/v1";
interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}
// Token refresh lock to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (data.status === "success" && data.data) {
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      return data.data.accessToken;
    }
  } catch (err) {
    console.error("Token refresh failed:", err);
  }
  // Refresh failed - clear tokens
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  return null;
}
export async function api<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };
  if (!skipAuth) {
    const token = localStorage.getItem("accessToken");
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }
  let res = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });
  // Handle 401 - attempt token refresh
  if (res.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      if (newToken) {
        onTokenRefreshed(newToken);
        // Retry original request
        (headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${API_URL}${endpoint}`, {
          ...fetchOptions,
          headers,
        });
      } else {
        // Redirect to login
        window.location.hash = "#/login";
        throw new Error("Session expired");
      }
    } else {
      // Wait for refresh to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (token) => {
          (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
          try {
            const retryRes = await fetch(`${API_URL}${endpoint}`, {
              ...fetchOptions,
              headers,
            });
            resolve(await retryRes.json());
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  }
  return res.json();
}
// Convenience methods
export const apiGet = <T>(endpoint: string) => api<T>(endpoint, { method: "GET" });
export const apiPost = <T>(endpoint: string, body: unknown) =>
  api<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
export const apiPut = <T>(endpoint: string, body: unknown) =>
  api<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
export const apiDelete = <T>(endpoint: string) =>
  api<T>(endpoint, { method: "DELETE" });