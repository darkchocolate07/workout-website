import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  AUTH_TOKEN_STORAGE_KEY,
  getStoredAuthToken,
} from "@/lib/auth-token";
import { resolveApiPath } from "@/lib/api-url";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());

  useEffect(() => {
    setAuthTokenGetter(async () => token);
    return () => setAuthTokenGetter(null);
  }, [token]);

  const applyAuthResponse = useCallback(async (res: Response) => {
    const text = await res.text();
    let data = {} as {
      accessToken?: string;
      message?: string;
      error?: string;
    };
    if (text) {
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        /* non-JSON body */
      }
    }

    if (!res.ok) {
      if (typeof data.message === "string") {
        throw new Error(data.message);
      }
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(
          "Cannot reach the API. Start the backend (default http://127.0.0.1:8080) or set API_PROXY_TARGET / VITE_API_BASE_URL.",
        );
      }
      if (text.trim().startsWith("<") || !text.trim()) {
        throw new Error(
          `Server error (${res.status}). Is the API running? Dev: run the API on port 8080 so Vite can proxy /api.`,
        );
      }
      throw new Error(`Request failed (${res.status} ${res.statusText})`);
    }

    if (!data.accessToken) {
      throw new Error("Invalid response from server (no access token)");
    }
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.accessToken);
    setToken(data.accessToken);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const res = await fetch(resolveApiPath("/api/auth/login"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        await applyAuthResponse(res);
      } catch (e) {
        if (e instanceof TypeError) {
          throw new Error(
            "Network error — cannot reach the API. Start the API server (e.g. `pnpm dev:api` → port 8080) while the app is running.",
          );
        }
        throw e;
      }
    },
    [applyAuthResponse],
  );

  const signup = useCallback(
    async (username: string, password: string) => {
      try {
        const res = await fetch(resolveApiPath("/api/auth/signup"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        await applyAuthResponse(res);
      } catch (e) {
        if (e instanceof TypeError) {
          throw new Error(
            "Network error — cannot reach the API. Start the API server (e.g. `pnpm dev:api` → port 8080) while the app is running.",
          );
        }
        throw e;
      }
    },
    [applyAuthResponse],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      login,
      signup,
      logout,
    }),
    [token, login, signup, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
