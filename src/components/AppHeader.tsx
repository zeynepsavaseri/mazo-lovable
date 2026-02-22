import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Activity, ClipboardList, Users } from "lucide-react";
import { DuotoneIcon } from "@/components/DuotoneIcon";

export function AppHeader() {
  const location = useLocation();

  const links = [
    { to: "/", label: "Dashboard", icon: Users },
    { to: "/intake", label: "Patient Intake", icon: ClipboardList },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-card/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-card/40">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl medical-gradient shadow-lg shadow-primary/25">
            <DuotoneIcon icon={Activity} className="h-4.5 w-4.5 text-primary-foreground" fillOpacity={0.3} />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold tracking-tight text-foreground leading-tight">
              MAVOflow
            </span>
            <span className="text-[10px] font-medium text-muted-foreground/70 tracking-widest uppercase leading-tight">
              Clinical Platform
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <DuotoneIcon icon={Icon} className="h-4 w-4" fillOpacity={isActive ? 0.2 : 0.1} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}