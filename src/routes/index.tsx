import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, GraduationCap, ArrowUpRight, Zap, Radio, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-aurora bg-grid">
      {/* Ambient orbs */}
      <motion.div
        animate={{ y: [0, -30, 0], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px] -z-10"
      />
      <motion.div
        animate={{ y: [0, 20, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/8 rounded-full blur-[120px] -z-10"
      />

      <div className="max-w-4xl w-full text-center mb-16 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="w-3.5 h-3.5 text-primary-light" />
            <span className="text-xs font-medium text-primary-light tracking-wide">Real-time lecture engagement</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-display font-bold text-text-primary mb-6 tracking-tight leading-[1.1]"
        >
          Lectures that
          <br />
          <span className="bg-gradient-to-r from-primary-light via-secondary to-primary-light bg-clip-text text-transparent">
            connect
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-text-secondary max-w-lg mx-auto leading-relaxed"
        >
          Live transcription, AI-powered Q&A, instant quizzes.
          Everything your classroom needs, in one place.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10"
      >
        {/* Student Card */}
        <Link to="/join" className="group">
          <div className="h-full card-glass-hover p-7 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/5 rounded-bl-full -z-0" />

            <div className="w-12 h-12 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center mb-5 group-hover:bg-secondary/25 group-hover:shadow-glow-secondary transition-all">
              <Users className="w-5 h-5 text-secondary-light" />
            </div>

            <h2 className="text-xl font-display font-bold text-text-primary mb-2 relative z-10">
              Join a Session
            </h2>
            <p className="text-text-muted text-sm leading-relaxed mb-8 flex-grow relative z-10">
              Enter your class code to join the live lecture, ask questions, and take quizzes.
            </p>

            <div className="self-start px-5 py-2.5 rounded-lg bg-secondary/15 text-secondary-light text-sm font-semibold flex items-center gap-2 group-hover:bg-secondary/25 transition-all">
              Join Now <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>

        {/* Teacher Card */}
        <Link to="/teacher" className="group">
          <div className="h-full card-glass-hover p-7 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-full -z-0" />

            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/25 group-hover:shadow-glow transition-all">
              <GraduationCap className="w-5 h-5 text-primary-light" />
            </div>

            <h2 className="text-xl font-display font-bold text-text-primary mb-2 relative z-10">
              Start a Class
            </h2>
            <p className="text-text-muted text-sm leading-relaxed mb-8 flex-grow relative z-10">
              Launch a live session with transcription, quizzes, and real-time student engagement.
            </p>

            <div className="self-start px-5 py-2.5 rounded-lg bg-primary/15 text-primary-light text-sm font-semibold flex items-center gap-2 group-hover:bg-primary/25 transition-all">
              Get Started <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.55 }}
        className="mt-16 flex flex-wrap items-center justify-center gap-3"
      >
        {[
          { icon: Radio, label: "Live Transcription" },
          { icon: BrainCircuit, label: "AI Q&A" },
          { icon: Zap, label: "Instant Quizzes" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-card border border-border text-text-muted text-xs font-medium">
            <Icon className="w-3 h-3" />
            {label}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
