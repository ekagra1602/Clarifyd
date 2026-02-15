import { Link, useLocation } from "@tanstack/react-router";

export default function Header() {
  const { pathname } = useLocation();
  const isSessionPage = pathname.startsWith("/teacher/session/");

  if (isSessionPage) return null;

  return (
    <header className={`fixed top-6 left-6 z-50 ${pathname.startsWith("/session/") ? "hidden md:block" : ""}`}>
      <Link to="/" className="flex items-center gap-2">
        <div className="bg-ink text-white px-3 py-1 rounded-lg border-2 border-transparent hover:border-coral hover:text-coral hover:bg-white transition-all transform -rotate-2">
          <span className="text-xl font-black tracking-tight">Wait</span>
        </div>
        <span className="text-xl font-black text-ink tracking-tight transform rotate-1">What</span>
      </Link>

      {/* <nav className="flex items-center gap-4">
        <Link
          to="/teacher"
          className="px-4 py-2 font-bold text-ink hover:text-coral transition-colors"
          activeProps={{ className: "!text-coral underline decoration-wavy decoration-2" }}
        >
          Teacher
        </Link>
        <Link
          to="/join"
          className="px-5 py-2 bg-white border-2 border-ink rounded-full font-bold text-ink shadow-comic-sm hover:shadow-comic hover:-translate-y-0.5 transition-all"
          activeProps={{ className: "!bg-coral !text-white !border-ink" }}
        >
          Join Session
        </Link>
      </nav> */}
    </header >
  );
}
