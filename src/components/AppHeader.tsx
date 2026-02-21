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
    <header className="sticky top-0 z-50 border-b border-border/40 bg-card/70 backdrop-blur-2xl">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl medical-gradient shadow-md shadow-primary/20 transition-shadow group-hover:shadow-lg group-hover:shadow-primary/25">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            TriageAI
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
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