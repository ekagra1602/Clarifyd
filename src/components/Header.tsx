import { Link, useLocation } from "@tanstack/react-router";
import logo from "../logo.png";

export default function Header() {
  const { pathname } = useLocation();
  const isSessionPage = pathname.startsWith("/teacher/session/") || pathname.startsWith("/session/");

  if (isSessionPage) return null;

  return (
    <header className={`fixed top-6 left-6 z-50 ${pathname.startsWith("/session/") ? "hidden md:block" : ""}`}>
      <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <img src={logo} alt="Clarifyd Logo" className="h-16 w-auto object-contain drop-shadow-sm transform -rotate-2" />
      </Link>
    </header>
  );
}
