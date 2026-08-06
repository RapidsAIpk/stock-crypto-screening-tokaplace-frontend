import { Link, useLocation } from "react-router-dom";
import { Activity, LayoutDashboard, Settings, LogOut, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppClock } from "@/components/layout/AppClock";

export function AppHeader() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="max-w-full px-2 sm:px-4">
        <div className="flex h-16 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary sm:h-10 sm:w-10">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="hidden text-[11px] uppercase tracking-[0.24em] text-muted-foreground sm:block">Trading Workspace</div>
            <span className="truncate font-semibold tracking-tight text-foreground">Screener</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <AppClock className="hidden sm:flex" />
        <nav className="flex items-center gap-1 rounded-full border border-border/70 bg-card/50 p-1">
          <Link
            to="/"
            title="Dashboard"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
              pathname === "/" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 sm:hidden" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            to="/watchlist"
            title="Watchlist"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
              pathname === "/watchlist" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Watchlist</span>
          </Link>
          <Link
            to="/settings"
            title="Settings"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
              pathname === "/settings" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          {user && (
            <button
              onClick={logout}
              title="Log out"
              className="ml-1 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:ml-2 sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </nav>
        </div>
      </div>
      </div>
    </header>
  );
}
