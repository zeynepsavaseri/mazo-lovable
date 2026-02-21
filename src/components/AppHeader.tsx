import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Activity, ClipboardList, Users } from "lucide-react";

export function AppHeader() {
  const location = useLocation();

  const links = [
    { to: "/", label: "Dashboard", icon: Users },
    { to: "/intake", label: "Patient Intake", icon: ClipboardList },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg medical-gradient shadow-sm">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            TriageAI
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}