import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Loader2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Mode = "signin" | "signup" | "forgot-email" | "forgot-reset";

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "text-xs text-muted-foreground";
const primaryButtonClass =
  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50";
const linkButtonClass = "text-xs text-muted-foreground hover:text-foreground transition-colors";

const AuthPage = () => {
  const { user, signIn, signUp, getSecurityQuestion, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const resetMessages = () => {
    setError("");
    setMessage("");
  };

  const switchMode = (next: Mode) => {
    resetMessages();
    setMode(next);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!securityQuestion.trim() || !securityAnswer.trim()) {
      setError("Security question and answer are required.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, securityQuestion.trim(), securityAnswer.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const question = await getSecurityQuestion(forgotEmail.trim());
      setForgotQuestion(question);
      setMode("forgot-reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No account found for that email.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      await resetPassword(forgotEmail.trim(), forgotAnswer, newPassword);
      setEmail(forgotEmail.trim());
      setPassword("");
      setForgotAnswer("");
      setNewPassword("");
      setMode("signin");
      setMessage("Password updated. You can now sign in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
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

  if (mode === "forgot-email") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <Header />
          <form onSubmit={handleForgotEmailSubmit} className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Forgot Password
            </h2>
            <div className="space-y-1">
              <label htmlFor="forgot-email" className={labelClass}>Email</label>
              <input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="text-xs text-destructive font-mono" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className={primaryButtonClass}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
            </button>
            <button type="button" onClick={() => switchMode("signin")} className={`w-full ${linkButtonClass}`}>
              Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "forgot-reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <Header />
          <form onSubmit={handleForgotResetSubmit} className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Answer Security Question
            </h2>
            <p className="text-sm text-foreground">{forgotQuestion}</p>
            <div className="space-y-1">
              <label htmlFor="forgot-answer" className={labelClass}>Answer</label>
              <input
                id="forgot-answer"
                type="text"
                value={forgotAnswer}
                onChange={(e) => setForgotAnswer(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="forgot-new-password" className={labelClass}>New Password</label>
              <input
                id="forgot-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-xs text-destructive font-mono" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className={primaryButtonClass}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Set New Password
            </button>
            <button type="button" onClick={() => switchMode("forgot-email")} className={`w-full ${linkButtonClass}`}>
              Back
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
              Limited to 2 accounts total.
            </p>
            <div className="space-y-1">
              <label htmlFor="signup-email" className={labelClass}>Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
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
              <label htmlFor="signup-question" className={labelClass}>Security Question</label>
              <input
                id="signup-question"
                type="text"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                required
                className={inputClass}
                placeholder="e.g. What was your first pet's name?"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="signup-answer" className={labelClass}>Security Answer</label>
              <input
                id="signup-answer"
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                required
                className={inputClass}
              />
              <p className="text-[11px] text-muted-foreground">
                Used to recover your account if you forget your password. Choose something only you would know.
              </p>
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
              onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                switchMode("forgot-email");
              }}
              className={linkButtonClass}
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
