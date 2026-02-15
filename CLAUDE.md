# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WaitWhat is a Convex-powered real-time lecture engagement platform. Teachers start sessions with join codes, students join to view live transcripts, ask AI questions, take quizzes, and signal when they're lost.

## Technology Stack

- **Backend**: Convex (real-time database, mutations/queries, no custom WebSocket needed)
- **Frontend**: React (Teacher Console + Student UI)
- **Transcription**: AssemblyAI real-time streaming (browser → AssemblyAI WebSocket → Convex mutation)
- **AI**: Gemini 2.5 Flash for Q&A, quiz generation, lost summaries, and session notes

## Architecture

The system uses Convex's real-time subscriptions for all live updates. Clients subscribe to queries; Convex handles sync automatically when mutations write data.

### Transcription Flow

```
┌─────────────────┐    1. Get token      ┌─────────────────┐
│     Browser     │ ──────────────────▶  │  Convex Action  │
│  (React + mic)  │ ◀──────────────────  │  (validates     │
│                 │    (temp token)      │   session)      │
└────────┬────────┘                      └─────────────────┘
         │ 2. Connect with token
         ▼
┌─────────────────────────────────────┐
│  AssemblyAI WebSocket               │
│  wss://api.assemblyai.com/v2/...    │
│                                     │
│  - Sends audio chunks (PCM 16kHz)   │
│  - Receives partial/final transcripts│
└────────┬────────────────────────────┘
         │ 3. Save final transcripts
         ▼
┌─────────────────┐
│  Convex Mutation│  ← Direct mutation (no shared secret)
│  (validates     │
│   session live) │
└─────────────────┘
```

### Data Model (7 tables)

- `sessions` - Lecture sessions with join codes, status, contextText, activeQuizId
- `transcriptLines` - **Append-only** transcript segments (critical for real-time performance)
- `quizzes` - Quiz definitions with MCQ questions array
- `quizResponses` - Student answers to quizzes
- `lostEvents` - "I'm lost" signals for spike detection
- `students` - Joined students with presence heartbeats, lost status, and AI-generated summaries
- `questions` - Student Q&A pairs with AI responses

### Key Design Decisions

1. **Append-only transcripts**: Never update existing lines; always append new ones
2. **Real-time via Convex queries**: No custom WebSocket implementation
3. **Context building for AI**: Combine slides + recent transcript + Q&A for grounded responses
4. **Fallback strategies**: Quiz generation, STT, and AI responses all need graceful degradation
5. **Browser-direct transcription**: No agent infrastructure; browser connects directly to AssemblyAI

### AI Service Architecture

The AI system lives in `convex/ai/` with these components:
- `service.ts` - Unified Gemini API wrapper for all AI features
- `prompts.ts` - System prompts and prompt builders for each feature type
- `compression.ts` - Token Company API integration for prompt compression
- `context.ts` - Context builder combining slides + transcript + Q&A
- `types.ts` - TypeScript types for AI responses

**AI Features:**
- Q&A with lecture context grounding
- Quiz generation from transcript content since last quiz (falls back to 5-minute window for first quiz)
- Lost summaries (AI-generated catch-up for confused students)
- Session notes (PDF-exportable summary)

**Quiz Generation Context:**
- Uses content since last quiz's `createdAt` timestamp (prevents overlap between consecutive quizzes)
- First quiz in session falls back to 5-minute window
- Feature flag `USE_SINCE_LAST_QUIZ` in `convex/quizzes.ts` controls this behavior
- `getLastQuizForSession` internal query retrieves the most recent quiz efficiently via compound index

## Build Phases

Implementation follows 4 phases in order (each depends on the previous):

1. **Core Session + Transcript**: Schema, session management, real-time transcript
2. **Quiz System**: Quiz tables, launch/submit mutations, stats queries, modal UI
3. **Lost Signals**: lostEvents table, markLost mutation, spike detection
4. **AI Integration**: questions table, askQuestion/saveAnswer, slide upload, context builder

## Commands

Once the project is set up with Convex:

```bash
npx convex dev          # Start Convex dev server with hot reload
npx convex deploy       # Deploy to production
npm run dev             # Start frontend + Convex dev servers
```

## API Surface

### Mutations (Writes)
- `createSession`, `joinSession` - Session management
- `appendTranscriptLine` - Add transcript segment (HTTP endpoint)
- `saveTranscriptFromBrowser` - Add transcript from browser (direct mutation)
- `uploadSlides` - Add context for AI
- `generateAndLaunchQuiz`, `submitQuiz`, `closeQuiz` - Quiz operations
- `markLost`, `clearLostStatus` - Lost signal operations
- `askQuestion`, `saveAnswer` - Q&A operations
- `heartbeat` - Student presence tracking

### Queries (Real-time Reads)
- `getSession`, `getSessionByCode` - Session lookup
- `listTranscript` - Last N lines (default 200)
- `getActiveQuiz`, `getQuizStats` - Quiz data and analytics
- `getLastQuizForSession` (internal) - Most recent quiz for context filtering
- `getLostSpikeStats` - Lost event analytics (60s, 5m windows)
- `listRecentQuestions` - Q&A feed (default 20)
- `getStudentCount`, `getLostStudentCount` - Student presence stats

### Actions (AI Operations)
- `getStreamingToken` - Get AssemblyAI token (validates session first)
- `generateSessionNotes` - Generate PDF-exportable session summary
- `generateLostSummary` - AI catch-up summary for lost students
