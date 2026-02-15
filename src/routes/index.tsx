import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, GraduationCap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating Background Shapes */}
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-16 right-16 w-28 h-28 border-4 border-soft-purple rounded-2xl opacity-40 -z-10 rotate-12"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-24 left-12 w-20 h-20 bg-mustard/20 rounded-full opacity-30 -z-10 border-4 border-dashed border-mustard"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/4 w-12 h-12 bg-coral/10 rounded-full -z-10"
      />

      <div className="max-w-5xl w-full text-center mb-16 relative">
        <h1 className="text-6xl md:text-7xl font-extrabold text-ink mb-6 tracking-tight leading-tight">
          Make every lecture <br />
          <span className="relative inline-block">
            <span className="relative z-10 text-coral transform -rotate-1 inline-block">unforgettable</span>
            <svg className="absolute w-[110%] h-[20px] -bottom-2 -left-[5%] text-soft-purple z-0" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
          </span>
        </h1>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">

        {/* Student Card — now first */}
        <Link to="/join" className="group">
          <motion.div
            className="h-full bg-white border-2 border-ink rounded-3xl p-8 shadow-comic transition-all duration-200 group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-mustard/20 rounded-br-[100px] -z-0 transition-transform group-hover:scale-110" />

            <div className="w-16 h-16 bg-mustard border-2 border-ink rounded-2xl flex items-center justify-center mb-6 shadow-comic-sm z-10 group-hover:-rotate-6 transition-transform">
              <Users className="w-8 h-8 text-ink" />
            </div>

            <h2 className="text-3xl font-extrabold text-ink mb-3 relative z-10">
              For Students
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10 flex-grow relative z-10">
              Join a class, ask questions anonymously, and signal when you're lost.
            </p>

            <div className="self-start px-6 py-3 bg-mustard text-ink font-bold rounded-xl flex items-center gap-2 border-2 border-ink shadow-comic-sm group-hover:shadow-none group-hover:translate-y-0.5 transition-all">
              Join Session <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        </Link>

        {/* Teacher Card — now second */}
        <Link to="/teacher" className="group">
          <motion.div
            className="h-full bg-white border-2 border-ink rounded-3xl p-8 shadow-comic transition-all duration-200 group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-coral/10 rounded-br-[100px] -z-0 transition-transform group-hover:scale-110" />

            <div className="w-16 h-16 bg-coral border-2 border-ink rounded-2xl flex items-center justify-center mb-6 shadow-comic-sm z-10 group-hover:rotate-6 transition-transform">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-3xl font-extrabold text-ink mb-3 relative z-10">
              For Teachers
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10 flex-grow relative z-10">
              Start a class, visualize confusion levels, and give real time comprehension checks.
            </p>

            <div className="self-start px-6 py-3 bg-coral text-white font-bold rounded-xl flex items-center gap-2 border-2 border-ink shadow-comic-sm group-hover:shadow-none group-hover:translate-y-0.5 transition-all">
              Start Class <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        </Link>

      </div>

    </div>
  );
}
