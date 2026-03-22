import { Dumbbell, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Library" },
  { href: "/log", label: "Log" },
  { href: "/plans", label: "Plans" },
  { href: "/ask", label: "Ask" },
] as const;

export function Navbar() {
  const { logout } = useAuth();
  const [loc] = useLocation();

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-50 w-full glass-panel border-x-0 border-t-0"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight hidden sm:inline">
              Krish Workout<span className="text-primary">.</span>
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 md:gap-1 text-xs sm:text-sm font-medium overflow-x-auto max-w-[42vw] sm:max-w-none">
            {NAV.map(({ href, label }) => {
              const active =
                href === "/"
                  ? loc === "/" || loc === ""
                  : loc === href || loc.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={logout}
            className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
          <div className="w-10 h-10 rounded-full bg-secondary border border-white/10 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop" 
              alt="User Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
