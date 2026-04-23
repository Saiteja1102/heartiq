import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Activity, Upload, FileText, Stethoscope, Pill, Settings, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "./Logo";
import { Button } from "./ui/button";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/upload", label: "Upload ECG", icon: Upload },
  { to: "/results/ecg_001", label: "My Results", icon: FileText },
  { to: "/consult", label: "Consult Doctor", icon: Stethoscope },
  { to: "/medicines", label: "Medicines", icon: Pill },
];

export const AppShell = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return null;

  const initials = (user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-sidebar/60 backdrop-blur-xl sticky top-0 h-screen">
        <div className="px-6 py-6"><Logo /></div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-white/[0.04] text-foreground before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary before:rounded-r"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-gradient-coral grid place-items-center font-mono text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm truncate">{user.email}</div>
              <div className="text-xs text-muted-foreground">Patient</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-white/10 px-2 py-2 flex justify-around">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`
          }>
            <Icon className="h-5 w-5" />
            {label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
