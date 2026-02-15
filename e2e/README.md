# Playwright E2E Tests

Comprehensive end-to-end tests for WaitWhat covering critical user flows.

## Running Tests

### Local Development

```bash
# Fast run (chromium only, ~15s)
bun run test:e2e

# Include mobile viewport (~22s)
bun run test:e2e:mobile

# Headed mode for debugging
bun run test:e2e:headed

# Interactive UI mode
bun run test:e2e:ui

# View test report
bun run test:e2e:report
```

### Prerequisites

- Convex dev server must be running (`npm run dev`)
- Tests will automatically start the dev server via `playwright.config.ts` webServer

### CI/CD

E2E tests require a live Convex backend and are not currently run in CI.
To enable CI testing:

1. Create a dedicated Convex test deployment
2. Add `CONVEX_DEPLOYMENT` secret to GitHub repository
3. Enable the E2E workflow by triggering it manually

## Test Coverage

### Navigation (4 tests)
- Home page displays teacher and student cards
- Navigation between home, teacher, and join pages
- Join page pre-fills code from URL parameter

### Session Flow (4 tests)
- Teacher creates session and gets join code
- Student joins with valid code
- Invalid join code handling
- Session end notification

### Quiz Flow (2 tests)
- Full lifecycle: launch, answer, close
- Ready indicator display

### Lost Signal (2 tests)
- Confusion meter updates
- Auto-opens chat with catch-up question

### Q&A Feature (3 tests)
- Open/close chat sidebar
- Submit question
- Empty chat placeholder

## Architecture

### Page Objects

- `home.page.ts` - Home page with teacher/student cards
- `teacher-index.page.ts` - Session creation page
- `teacher-session.page.ts` - Teacher console
- `join.page.ts` - Student join page
- `student-session.page.ts` - Student session view

### Key Features

- **Parallel execution**: Each test creates isolated sessions via unique join codes
- **Real-time updates**: Tests use `toPass()` for eventual consistency
- **Mobile support**: Tests run on both desktop and mobile viewports
- **Performance**: 4 workers locally, 2 in CI

### Troubleshooting

**Tests timing out**: Increase timeouts in `playwright.config.ts` or page objects

**Selector not found**: Check `test-results/` for screenshots and accessibility snapshots

**Convex connection errors**: Ensure `npm run dev` is working and Convex is configured
