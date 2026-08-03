import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { appEnv } from "@/config/env";

export interface AuthUser {
  uid: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    securityQuestion: string,
    securityAnswer: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  getSecurityQuestion: (email: string) => Promise<string>;
  /** Forgot-password flow (logged out): verify the security answer, then set a new password. */
  resetPassword: (email: string, securityAnswer: string, newPassword: string) => Promise<void>;
  /** Logged-in flow: verify the current password, then set a new one. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_STORAGE_KEY = "screener.authToken";

// Auth lives under the API root (e.g. https://host), not under /screen -
// the runtime API base used for screening calls is /screen-suffixed.
function apiRoot(): string {
  const override = localStorage.getItem("screener.apiBaseOverride")?.trim();
  const base = (override || appEnv.apiBase).replace(/\/+$/, "");
  return base.replace(/\/screen$/, "");
}

function authToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") {
      return data.detail;
    }
  } catch {
    // fall through to default message
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = authToken();
      if (!token) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${apiRoot()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error("Session invalid");
        }
        const data = await res.json();
        if (!cancelled) {
          setUser({ uid: data.user.user_id, email: data.user.email });
        }
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetch(`${apiRoot()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, "Invalid email or password."));
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setUser({ uid: data.user.user_id, email: data.user.email });
  };

  const signUp = async (
    email: string,
    password: string,
    securityQuestion: string,
    securityAnswer: string,
  ) => {
    const res = await fetch(`${apiRoot()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        security_question: securityQuestion,
        security_answer: securityAnswer,
      }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, "Failed to create account."));
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setUser({ uid: data.user.user_id, email: data.user.email });
  };

  const logout = async () => {
    const token = authToken();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);

    if (token) {
      try {
        await fetch(`${apiRoot()}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Best-effort server-side session cleanup; the client has already
        // forgotten the token either way.
      }
    }
  };

  const getSecurityQuestion = async (email: string): Promise<string> => {
    const res = await fetch(
      `${apiRoot()}/auth/security-question?email=${encodeURIComponent(email)}`,
    );
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, "No account found for that email."));
    }
    const data = await res.json();
    return data.question as string;
  };

  const resetPassword = async (email: string, securityAnswer: string, newPassword: string) => {
    const res = await fetch(`${apiRoot()}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        security_answer: securityAnswer,
        new_password: newPassword,
      }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, "Failed to reset password."));
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const token = authToken();
    const res = await fetch(`${apiRoot()}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, "Failed to change password."));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        logout,
        getSecurityQuestion,
        resetPassword,
        changePassword,
      }}
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
