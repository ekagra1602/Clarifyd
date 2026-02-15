import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, GraduationCap, ArrowRight, Github } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating Background Shapes */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 left-10 w-32 h-32 border-4 border-soft-purple rounded-full opacity-50 -z-10 border-dashed"
      />
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-20 right-10 w-24 h-24 bg-mustard rounded-xl opacity-20 -z-10 rotate-12"
      />

      <div className="max-w-5xl w-full text-center mb-16 relative">
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-ink shadow-comic-sm mb-6"
        >
          <Sparkles className="w-4 h-4 text-mustard fill-current" />
          <span className="font-bold text-sm tracking-wide uppercase">Classroom Engagement 2.0</span>
        </motion.div> */}

        <h1 className="text-6xl md:text-7xl font-black text-ink mb-6 tracking-tight leading-tight">
          Make every lecture <br />
          <span className="relative inline-block">
            <span className="relative z-10 text-coral transform -rotate-2 inline-block">unforgettable</span>
            <svg className="absolute w-[110%] h-[20px] -bottom-2 -left-[5%] text-mustard z-0" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
          </span>
        </h1>
        {/* <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
          Real-time comprehension checks, live polls, and instant feedback. No boring dashboards allowed.
        </p> */}
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">

        {/* Teacher Card */}
        <Link to="/teacher" className="group">
          <motion.div
            className="h-full bg-white border-2 border-ink rounded-3xl p-8 shadow-comic transition-all duration-200 group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-soft-purple/30 rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110" />

            <div className="w-16 h-16 bg-soft-purple border-2 border-ink rounded-2xl flex items-center justify-center mb-6 shadow-comic-sm z-10 group-hover:rotate-6 transition-transform">
              <GraduationCap className="w-8 h-8 text-ink" />
            </div>

            <h2 className="text-3xl font-black text-ink mb-3 relative z-10">
              For Teachers
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10 flex-grow relative z-10">
              Start a class, visualize confusion levels, and give real time comprehension checks.
            </p>

            <div className="self-start px-6 py-3 bg-ink text-white font-bold rounded-xl flex items-center gap-2 group-hover:bg-coral transition-colors">
              Start Class <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        </Link>

        {/* Student Card */}
        <Link to="/join" className="group">
          <motion.div
            className="h-full bg-white border-2 border-ink rounded-3xl p-8 shadow-comic transition-all duration-200 group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-mustard/30 rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110" />

            <div className="w-16 h-16 bg-mustard border-2 border-ink rounded-2xl flex items-center justify-center mb-6 shadow-comic-sm z-10 group-hover:-rotate-6 transition-transform">
              <Users className="w-8 h-8 text-ink" />
            </div>

            <h2 className="text-3xl font-black text-ink mb-3 relative z-10">
              For Students
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10 flex-grow relative z-10">
              Join a class, ask questions anonymously, and signal when you're lost.
            </p>

            <div className="self-start px-6 py-3 bg-ink text-white font-bold rounded-xl flex items-center gap-2 group-hover:bg-mustard transition-colors">
              Join Session <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        </Link>

      </div>

      {/* Footer */}
      <footer className="mt-16 text-center">
        <a
          href="https://github.com/CarterT27/waitwhat"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-ink/60 hover:text-ink font-medium transition-colors group"
        >
          <Github className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span>View on GitHub</span>
        </a>
      </footer>
    </div>
  );
}
