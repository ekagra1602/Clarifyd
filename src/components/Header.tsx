import { Link, useLocation } from "@tanstack/react-router";

export default function Header() {
  const { pathname } = useLocation();
  const isSessionPage = pathname.startsWith("/teacher/session/") || pathname.startsWith("/session/");

  if (isSessionPage) return null;

  return (
    <header className="fixed top-6 left-6 z-50">
      <Link to="/" className="flex items-center gap-2">
        <div className="bg-coral text-white px-4 py-1 rounded-lg border-2 border-transparent hover:border-ink hover:bg-white hover:text-coral transition-all transform -rotate-1">
          <span className="text-xl font-extrabold tracking-tight">Clarifyd</span>
        </div>
      </Link>
    </header>
  );
}
