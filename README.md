# Clarifyd

**Empower students to share their voice in learning environments by using AI to personalize the classroom experience in real time.**

---

## Inspiration

As 4 college students at large universities, we have all sat through huge lectures where missing even a few seconds can derail the rest of the class. In fast-paced math and technical lectures, a professor can move through steps on the board with almost no pause, and if you do not catch one definition or one algebra move, it is hard to recover in real time. Asking questions in front of hundreds of people can also be stressful, and it can be even harder if you have anxiety, a speech impediment, or a language barrier. That experience is what pushed us to build **Clarifyd**, so students can fill gaps during the lecture itself and stay engaged instead of falling behind.

## What It Does

**Clarifyd** is a real-time lecture copilot that helps students get unstuck without interrupting class. It works both **in-person** and over **Zoom**, giving every student a personalized AI layer on top of any lecture.

**For Students:**
- **Live Transcript** streamed in real time from the lecturer's microphone or Zoom audio
- **Private, Transcript-Grounded Q&A** powered by Gemini so students can ask "what does that mean?" the moment they are confused, without raising their hand
- **Personalized Accessibility** — students set language preference, learning style, and accessibility needs during onboarding; the AI adapts explanations accordingly (simplified language for ESL, audio for blind students, step-by-step breakdowns for different learning styles)
- **AI Video Generation** via Google Veo 3.1 — students can generate short explanatory videos from lecture context or custom prompts (e.g., "Explain gravity visually"), with prompt optimization through Gemini
- **DiceBear Avatars** — customizable student profiles with diverse, inclusive avatar styles
- **Quiz Leaderboard** with streaks and scores for gamified comprehension checks

**For Instructors:**
- **Live Confusion Signals** — see when students hit "I'm Lost" in real time with spike detection
- **AI-Generated Quizzes** from transcript content to check understanding on the fly
- **Student Question Feed** — see what students are asking and which topics are most confusing
- **Session Notes Export** — AI-generated PDF summaries of the entire lecture
- **Zoom Integration** — works seamlessly with Zoom meetings for remote and hybrid classrooms

## How We Built It

We built **Clarifyd** with a React + Tailwind frontend and a **Convex** real-time backend, leaning heavily on the **Google Cloud AI** ecosystem and the **Zoom** platform to power the core experience.

**Google Cloud AI (Google AI Track):**
- **Gemini 2.5 Flash** is the brain of the entire platform — it powers transcript-grounded Q&A, adaptive quiz generation, lost-student summaries, session note generation, and prompt optimization for video. Every AI response is grounded in the live transcript and uploaded course materials so answers stay relevant to what the professor is actually teaching.
- **Google Veo 3.1** generates short explanatory videos on demand. Students can trigger video generation from lecture context (Gemini summarizes recent transcript into a visual prompt) or type their own prompt like "Explain gravity visually." Gemini optimizes every prompt before sending it to Veo for higher quality output.
- **Google Generative Language API** handles the full video generation pipeline with long-running operations and polling for completion.
- Built for future **Google Classroom** integration to automatically post AI-generated study materials after each lecture.

**Zoom Integration (Zoom Education Track):**
- Clarifyd integrates with **Zoom** to capture live audio and transcription data, making the platform work seamlessly for **remote and hybrid classrooms** — not just in-person lectures.
- The **Zoom API** provides audio transcripts and meeting context that feed directly into the AI pipeline, so students in a Zoom lecture get the same real-time Q&A, quizzes, and video generation as students in person.
- Deployed on **Render** alongside the Zoom integration for reliable hosting and webhook handling.
- Demo flow: Part 1 shows a student using Clarifyd in person, Part 2 shows the same experience working over Zoom for online learners.

**Conversational AI (Decagon Track):**
- The student-facing AI assistant acts as a **conversational AI tutor** that understands lecture context in real time. Students can have a natural back-and-forth conversation about what the professor just said, ask follow-up questions, and get answers personalized to their learning profile — all without interrupting class.

**Real-Time Infrastructure:**
- **Convex** provides real-time subscriptions so every student sees transcript updates, quiz launches, and confusion signals instantly without polling.
- **AssemblyAI** handles speech-to-text streaming with ~300ms latency directly from the browser.
- **Token Company** compresses long transcripts and course materials to keep AI costs low while maintaining personalization quality.

**Personalization & Accessibility (Human Flourishing Track):**
- Students complete an onboarding profile capturing disabilities, language preference, learning style, and pace preference.
- The AI adapts its responses based on this profile — translating questions for ESL students, simplifying explanations for different learning styles, generating audio for visually impaired students, and adjusting pace.
- Inclusive **DiceBear avatars** with diverse styles so every student feels represented.
- The core mission is reducing barriers to participation: students who might never raise their hand — because of anxiety, a speech impediment, or a language barrier — can still get help in real time.

## Challenges We Ran Into

Our biggest challenge was making the real-time pipeline stable and fast. Coordinating live audio streaming, AI inference, and real-time database updates while keeping latency under a second required careful architecture. We also had to balance power and simplicity — we wanted students and professors to be able to use Clarifyd with just a couple of clicks, even though the system includes live speech-to-text, Q&A, video generation, quizzes, and personalized notes. Integrating the Zoom API alongside in-person microphone capture added another layer of complexity to the data ingestion pipeline. Finally, ensuring the AI stayed grounded in the live transcript and course materials, while still tailoring explanations and generated videos to each student's profile, required extensive prompt engineering and context management.

## Accomplishments We Are Proud Of

We built a tool we would genuinely use in our own lectures, and we got live audio flowing through a full AI-powered workflow end to end — from microphone or Zoom, through transcription, into Gemini for understanding, and out to students as personalized answers and Veo-generated videos. We are proud that Clarifyd supports both sides of the classroom by helping students in the moment while giving instructors actionable signals about what is not landing. The accessibility-first design means students who might never raise their hand — because of language barriers, anxiety, or disabilities — can still get help in real time. We are also proud that we can work with long transcripts and large course materials without inflating costs, thanks to prompt compression, which makes personalization practical at scale.

## What We Learned

Building Clarifyd taught us how to iterate quickly while working through a complex, real-time system. We learned a lot about reliability, latency, and product design under tight constraints. Integrating multiple Google AI services — Gemini 2.5 Flash for text understanding, Veo 3.1 for video generation, and the Generative Language API for orchestration — into a single coherent product showed us how powerful the Google Cloud AI ecosystem is when the pieces work together. Connecting the Zoom API for hybrid classroom support taught us how to build products that meet students where they already are. Most importantly, we kept coming back to a user-focused question: does this actually help a student learn better during lecture?

## What's Next for Clarifyd

- **Google Classroom Integration** — automatically post AI-generated summaries, flashcards, and study materials as Classroom posts after each lecture
- **Teacher MCP Agent** — an agentic workflow that gives instructors live, accumulated insights and suggestions for how to alter teaching based on student feedback
- **After-Class Study Mode** — post-session review with full transcript, AI summary, key formulas, auto-generated flashcards, and practice questions
- **Auto Mini-Recap Mode** — one-click "Summarize last 3 minutes" for students who zone out, generating a 3-bullet recap with a checkpoint question
- **Diagram Generation** — use Gemini to generate flowcharts and visual explanations for complex topics
- **University Pilot** — test Clarifyd in larger lectures and measure which confusion signals and comprehension checks are most effective in practice

## Built With

### Google
- **Google Gemini 2.5 Flash** — AI engine for Q&A, quiz generation, summaries, and prompt optimization
- **Google Veo 3.1** — AI video generation from lecture context and student prompts
- **Google Generative Language API** — video generation pipeline with long-running operations
- **Google Cloud AI** — unified AI infrastructure

### Zoom
- **Zoom API** — audio transcript and meeting data capture for remote/hybrid classrooms
- **Zoom Education Track** — seamless integration for online learners

### Infrastructure
- **Convex** — real-time database and serverless backend
- **Render** — application hosting and deployment
- **AssemblyAI** — real-time speech-to-text streaming (~300ms latency)
- **Token Company** — prompt compression for cost-efficient AI at scale

### Frontend & Tooling
- **React 19** — UI framework
- **TanStack Router & Start** — type-safe routing and SSR
- **Tailwind CSS 4** — utility-first styling
- **Framer Motion** — animations
- **TypeScript** — type-safe JavaScript
- **Vite** — build tool and dev server
- **Bun** — JavaScript runtime and package manager
- **DiceBear** — inclusive, customizable avatar generation
- **jsPDF** — PDF export for session notes

---

## Development

### Prerequisites

You'll need accounts with:
- [Convex](https://convex.dev) — real-time backend
- [Google AI Studio](https://aistudio.google.com) — Gemini API key (also used for Veo)
- [AssemblyAI](https://www.assemblyai.com) — speech-to-text API
- [Token Company](https://tokencompany.com) (optional) — prompt compression

### Local Development

1. Install dependencies:

```bash
bun install
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

Set these in the [Convex Dashboard](https://dashboard.convex.dev) under **Settings > Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | Yes | AI model API key |
| `ASSEMBLYAI_API_KEY` | Yes | Speech-to-text API key |
| `VEO_API_KEY` | Yes | Google AI API key for Veo video generation |
| `VEO_MODEL` | No | Veo model name (default: `veo-3.1-fast-generate-preview`) |
| `TRANSCRIPTION_SECRET` | Yes | Generate: `openssl rand -base64 32` |
| `TOKEN_COMPANY_API_KEY` | No | Prompt compression API key |
| `COMPRESSION_ENABLED` | No | Set to `"false"` to disable compression |

### Transcription

Transcription uses AssemblyAI's Universal Streaming v3 with ~300ms latency. The browser connects directly to AssemblyAI via temporary tokens — no separate transcription server needed.

### Quiz Generation

Quizzes use transcript content **since the last quiz** to prevent overlap. A feature flag (`USE_SINCE_LAST_QUIZ` in `convex/quizzes.ts`) can revert to a fixed 5-minute window.

## Documentation

See [SPEC.md](./SPEC.md) for full technical specification.
