## Features

- Live transcription display (AssemblyAI Universal Streaming)
- AI-powered Q&A (Gemini 2.5 Flash)
- Teacher-triggered comprehension quizzes (AI-generated from transcript content since last quiz)
- "I'm lost" signals with spike detection
- QR code join for students
- Session notes export (PDF)

## Built With

### Core Infrastructure

- [Convex](https://convex.dev) - Real-time database and backend platform
- [Google Gemini 2.5 Flash](https://ai.google.dev/gemini-api) - AI model for Q&A, quiz generation, and session summaries
- [AssemblyAI Universal Streaming](https://www.assemblyai.com/universal-streaming) - Real-time speech-to-text transcription (~300ms latency)
- [Token Company](https://www.tokencompany.com) - Prompt compression API for reduced token costs

### Frontend & Tooling

- [React 19](https://react.dev) - UI framework
- [TanStack Router](https://tanstack.com/router) & [Start](https://tanstack.com/start) - Type-safe routing and SSR
- [TailwindCSS 4](https://tailwindcss.com) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Lucide React](https://lucide.dev) - Icon system
- [Vite 7](https://vite.dev) - Build tool and dev server
- [TypeScript 5](https://www.typescriptlang.org) - Type-safe JavaScript
- [Vitest](https://vitest.dev) - Unit testing framework
- [qrcode](https://www.npmjs.com/package/qrcode) - QR code generation for session join
- [jsPDF](https://github.com/parallax/jsPDF) - PDF export for session notes

## Setup

### Prerequisites

You'll need accounts with:
- [Convex](https://convex.dev) - Real-time backend
- [AssemblyAI](https://www.assemblyai.com) - Speech-to-text API
- [Google AI Studio](https://aistudio.google.com) - Gemini API
- [Token Company](https://tokencompany.com) (optional) - Prompt compression

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

3. Start dev servers:
   ```bash
   npm run dev
   ```
   This starts both Convex backend and frontend dev server concurrently.

### Environment Variables

#### Frontend (`.env.local`)

| Variable | Description | Get From |
|----------|-------------|----------|
| `VITE_CONVEX_URL` | Convex deployment URL | Auto-set by `npx convex dev` |

#### Convex Backend (Dashboard)

These must be set in the [Convex Dashboard](https://dashboard.convex.dev) under **Settings > Environment Variables**, not in local `.env` files.

| Variable | Required | Get From |
|----------|----------|----------|
| `GEMINI_API_KEY` | Yes | [Google AI Studio](https://aistudio.google.com/apikey) |
| `ASSEMBLYAI_API_KEY` | Yes | [AssemblyAI Dashboard](https://www.assemblyai.com/dashboard) |
| `TRANSCRIPTION_SECRET` | Yes | Generate: `openssl rand -base64 32` |
| `TOKEN_COMPANY_API_KEY` | No | [Token Company](https://tokencompany.com) |
| `COMPRESSION_ENABLED` | No | Set to `"false"` to disable prompt compression |

## Transcription System

Transcription uses AssemblyAI's Universal Streaming v3 API, which provides:
- **Real-time streaming** (~300ms latency) directly from browser to AssemblyAI
- **No agent infrastructure** - browser connects via temporary tokens from Convex
- **Audio processing** - AudioWorklet resamples microphone audio to 16kHz PCM
- **Automatic scaling** - handles 100+ concurrent streams with auto-scaling

### How it works

1. Teacher clicks "Start Transcription"
2. Browser requests temporary token from Convex (validates session is live)
3. Browser connects directly to AssemblyAI WebSocket with token
4. Microphone audio is resampled to 16kHz and streamed as raw PCM binary
5. AssemblyAI sends back partial and final transcripts
6. Final transcripts are saved to Convex via mutation

No separate transcription agent deployment needed.

## Quiz Generation

When a teacher generates a quiz, the AI uses transcript content **since the last quiz** (not a fixed 5-minute window). This prevents overlap when quizzes are generated in quick succession.

| Scenario | Behavior |
|----------|----------|
| First quiz in session | Uses last 5 minutes of transcript |
| Subsequent quizzes | Uses content since previous quiz's creation time |
| Very long gap | Still applies 100-line limit to cap context size |

A feature flag (`USE_SINCE_LAST_QUIZ` in `convex/quizzes.ts`) can revert to the legacy 5-minute window behavior if needed.

## Deployment

The app deploys to Cloudflare Pages with automatic GitHub integration:
- Push to `main` triggers automatic deployment
- Convex backend deploys via `npx convex deploy`

## Documentation

See [SPEC.md](./SPEC.md) for full technical specification.
