# Clarifyd

A real-time lecture platform where students watch AI-generated videos, compete on quiz leaderboards, and get instant answers — all while the lecture is happening.

---

## Features

### AI Video Studio
Students can generate short explainer videos on demand during a lecture. Hit "Generate from Current Lecture" and the AI turns recent transcript into a visual video via **Google Veo 3.1**, or type a custom prompt like *"Show me how gravity works"*. Every prompt is optimized by Gemini before generation.

### Live Quizzes + Leaderboard
Teachers launch AI-generated quizzes from the live transcript with one click. Students answer in real time, earn streaks for consecutive correct answers, and climb the session leaderboard. Scores, streaks, and rankings update live.

### Real-Time Transcription
The teacher's mic streams audio through **AssemblyAI** with ~300ms latency. Students see every word appear as it's spoken — large, clean text that fades older lines so the current sentence always stands out.

### AI Q&A Chat
Students open a chat overlay and ask anything about the lecture. The AI answers grounded in the live transcript and any uploaded course materials, so responses are always relevant to what's actually being taught. Teachers can review, approve, and add follow-ups to AI answers.

### Personalized Profiles
Students set their language, learning style, pace preference, and accessibility needs during onboarding. The AI adapts — translating for ESL students, simplifying for different learning styles, adjusting explanations based on pace. Customizable DiceBear avatars let every student pick a look that fits.

### Teacher Dashboard
Teachers get a single-page command center: start/stop transcription, launch quizzes, view live quiz stats with per-choice distributions, browse the student question feed, run AI question summaries, upload class context (PDFs, slides, notes), share a QR join code, and export session notes when class ends.

### Session Notes
After a session, both teachers and students can download AI-generated markdown summary notes covering the key topics from the lecture.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TanStack Router, Tailwind CSS 4, Framer Motion |
| Backend | Convex (real-time database + serverless functions) |
| AI | Google Gemini 2.5 Flash (Q&A, quizzes, summaries, prompt optimization) |
| Video | Google Veo 3.1 (AI video generation) |
| Speech-to-Text | AssemblyAI Universal Streaming v3 |
| Compression | Token Company (prompt compression for long transcripts) |
| Avatars | DiceBear API |
| Hosting | Render |

---

## Getting Started

### Prerequisites

- [Convex](https://convex.dev) account
- [Google AI Studio](https://aistudio.google.com) API key (Gemini + Veo)
- [AssemblyAI](https://www.assemblyai.com) API key

### Setup

```bash
bun install
cp .env.example .env.local
npm run dev
```

### Environment Variables

**Frontend** (`.env.local`):

| Variable | Description |
|----------|-------------|
| `VITE_CONVEX_URL` | Auto-set by `npx convex dev` |

**Convex Backend** (set in [Dashboard](https://dashboard.convex.dev) > Settings > Environment Variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | Yes | AI model API key |
| `ASSEMBLYAI_API_KEY` | Yes | Speech-to-text |
| `VEO_API_KEY` | Yes | Google AI key for Veo video generation |
| `VEO_MODEL` | No | Veo model (default: `veo-3.1-fast-generate-preview`) |
| `TRANSCRIPTION_SECRET` | Yes | `openssl rand -base64 32` |
| `TOKEN_COMPANY_API_KEY` | No | Prompt compression |
| `COMPRESSION_ENABLED` | No | `"false"` to disable |
