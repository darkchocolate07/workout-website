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
    const data = (await res.json().catch(() => ({}))) as {
      accessToken?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : "Request failed",
      );
    }
    if (!data.accessToken) {
      throw new Error("Invalid response from server");
    }
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.accessToken);
    setToken(data.accessToken);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch(resolveApiPath("/api/auth/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      await applyAuthResponse(res);
    },
    [applyAuthResponse],
  );

  const signup = useCallback(
    async (username: string, password: string) => {
      const res = await fetch(resolveApiPath("/api/auth/signup"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      await applyAuthResponse(res);
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
