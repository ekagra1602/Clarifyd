import { Link, useLocation } from "@tanstack/react-router";

export default function Header() {
  const { pathname } = useLocation();
  const isSessionPage = pathname.startsWith("/teacher/session/") || pathname.startsWith("/session/");

  if (isSessionPage) return null;

  return (
    <header className={`fixed top-5 left-6 z-50 ${pathname.startsWith("/session/") ? "hidden md:block" : ""}`}>
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
          <span className="text-white font-display font-bold text-sm">C</span>
        </div>
        <span className="font-display font-bold text-text-primary text-lg tracking-tight group-hover:text-primary-light transition-colors">
          clarifyd
        </span>
      </Link>
    </header>
  );
}
