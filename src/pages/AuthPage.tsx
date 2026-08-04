import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Loader2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { deleteUser } from "firebase/auth";
import { appEnv } from "@/config/env";

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "text-xs text-muted-foreground";
const primaryButtonClass =
  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50";
const linkButtonClass = "text-xs text-muted-foreground hover:text-foreground transition-colors";

function apiRoot(): string {
  const override = localStorage.getItem("screener.apiBaseOverride")?.trim();
  const base = (override || appEnv.apiBase).replace(/\/+$/, "");
  return base.replace(/\/screen$/, "");
}

const AuthPage = () => {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteKey, setInviteKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const describeFirebaseError = (err: unknown, fallback: string) => {
    const firebaseErr = err as { code?: string; message?: string };
    const code = firebaseErr?.code || "";
    if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
      return "Invalid email or password.";
    }
    if (code === "auth/email-already-in-use") {
      return "Email already in use.";
    }
    if (code === "auth/weak-password") {
      return "Password must be at least 6 characters.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many attempts. Please try again later.";
    }
    if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    }
    return firebaseErr?.message || fallback;
  };

  const switchMode = (next: "signin" | "signup" | "reset") => {
    setError("");
    setMessage("");
    setMode(next);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(describeFirebaseError(err, "Authentication failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!inviteKey.trim()) {
      setError("Invite key is required.");
      return;
    }
    setLoading(true);

    let createdUser: Awaited<ReturnType<typeof signUp>> | null = null;
    try {
      createdUser = await signUp(email, password);

      const res = await fetch(`${apiRoot()}/auth/register-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: createdUser.uid,
          email: createdUser.email,
          invite_key: inviteKey.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to register account.");
      }
      // Success: onAuthStateChanged picks up the signed-in user and the
      // redirect effect above sends them into the app.
    } catch (err) {
      // Roll back the Firebase account if it was created but the backend
      // rejected it (bad invite key, or the 2-account cap was already
      // reached) - a user can always delete their own freshly-created
      // account, no admin rights required.
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch {
          // best-effort cleanup
        }
      }
      setError(err instanceof Error ? err.message : describeFirebaseError(err, "Failed to create account."));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(describeFirebaseError(err, "Failed to send reset email."));
    } finally {
      setLoading(false);
    }
  };

  const Header = () => (
    <div className="flex items-center justify-center gap-2">
      <Activity className="h-6 w-6 text-primary" />
      <span className="text-xl font-semibold text-foreground">Screener</span>
    </div>
  );

  if (mode === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <Header />
          <form onSubmit={handleReset} className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">Reset Password</h2>
            <div className="space-y-1">
              <label htmlFor="reset-email" className={labelClass}>Email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="text-xs text-destructive font-mono" role="alert">{error}</p>}
            {message && <p className="text-xs text-primary font-mono" role="status">{message}</p>}
            <button type="submit" disabled={loading} className={primaryButtonClass}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Reset Link
            </button>
            <button type="button" onClick={() => switchMode("signin")} className={`w-full ${linkButtonClass}`}>
              Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "signup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <Header />
          <form onSubmit={handleSignUp} className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Create Account
            </h2>
            <p className="text-xs text-muted-foreground text-center">
              Limited to 2 accounts total. An invite key is required.
            </p>
            <div className="space-y-1">
              <label htmlFor="signup-email" className={labelClass}>Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="signup-password" className={labelClass}>Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="signup-invite-key" className={labelClass}>Invite Key</label>
              <input
                id="signup-invite-key"
                type="text"
                value={inviteKey}
                onChange={e => setInviteKey(e.target.value)}
                required
                className={inputClass}
                placeholder="Provided to you separately"
              />
            </div>
            {error && <p className="text-xs text-destructive font-mono" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className={primaryButtonClass}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </button>
            <button type="button" onClick={() => switchMode("signin")} className={`w-full ${linkButtonClass}`}>
              Already have an account? Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <Header />
        <form onSubmit={handleSignIn} className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">
            Sign In
          </h2>
          <div className="space-y-1">
            <label htmlFor="auth-email" className={labelClass}>Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="auth-password" className={labelClass}>Password</label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                className={`${inputClass} pr-10`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive font-mono" role="alert">{error}</p>}
          {message && <p className="text-xs text-primary font-mono" role="status">{message}</p>}
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => switchMode("signup")} className={linkButtonClass}>
              Create account
            </button>
            <button type="button" onClick={() => switchMode("reset")} className={linkButtonClass}>
              Forgot password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
