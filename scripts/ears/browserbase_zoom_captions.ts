/**
 * Approach A: BrowserBase (or local) closed-caption scraping.
 *
 * This script opens a Zoom Web Client URL and watches a caption DOM element.
 * Whenever the text changes, it pushes the latest line into Convex via
 * POST /transcription.
 *
 * Run (with bun):
 *   bun scripts/ears/browserbase_zoom_captions.ts
 *
 * Required env:
 *   SESSION_ID
 *   CONVEX_TRANSCRIPTION_URL   (e.g. https://<deployment>.convex.site/transcription)
 *   TRANSCRIPTION_SECRET
 *   ZOOM_JOIN_URL              (Zoom Web Client join URL)
 *
 * Optional env:
 *   SOURCE                     (default: browserbase_cc)
 *   ZOOM_CC_SELECTOR           (CSS selector for caption container)
 *   BROWSERBASE_CONNECT_URL    (Playwright ws endpoint / CDP url for BrowserBase)
 */

import { chromium, type Browser, type Page } from "playwright";

const SESSION_ID = process.env.SESSION_ID;
const CONVEX_TRANSCRIPTION_URL = process.env.CONVEX_TRANSCRIPTION_URL;
const TRANSCRIPTION_SECRET = process.env.TRANSCRIPTION_SECRET;
const ZOOM_JOIN_URL = process.env.ZOOM_JOIN_URL;

const SOURCE = process.env.SOURCE ?? "browserbase_cc";

// This selector varies by Zoom UI + language + whether CC is enabled.
// Start with something broad, then refine after inspecting the DOM.
const ZOOM_CC_SELECTOR =
  process.env.ZOOM_CC_SELECTOR ??
  "[data-testid='closed-caption'], [aria-label*='caption' i], .closed-caption-container";

function must(v: string | undefined, name: string): string {
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function postLine(text: string) {
  const payload = {
    sessionId: SESSION_ID,
    text,
    secret: TRANSCRIPTION_SECRET,
    source: SOURCE,
    createdAt: Date.now(),
  };

  const res = await fetch(CONVEX_TRANSCRIPTION_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Failed to push transcript line:", res.status, body);
  }
}

async function connectBrowser(): Promise<Browser> {
  const connectUrl = process.env.BROWSERBASE_CONNECT_URL;
  if (!connectUrl) {
    // Local fallback
    return chromium.launch({ headless: true });
  }

  // Some providers expose a CDP endpoint; others expose a Playwright WS endpoint.
  // Try CDP first, then WS.
  try {
    return await chromium.connectOverCDP(connectUrl);
  } catch {
    return await chromium.connect(connectUrl);
  }
}

async function main() {
  must(SESSION_ID, "SESSION_ID");
  must(CONVEX_TRANSCRIPTION_URL, "CONVEX_TRANSCRIPTION_URL");
  must(TRANSCRIPTION_SECRET, "TRANSCRIPTION_SECRET");
  must(ZOOM_JOIN_URL, "ZOOM_JOIN_URL");

  const browser = await connectBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("[page]", msg.text());
    }
  });

  console.log("Opening:", ZOOM_JOIN_URL);
  await page.goto(ZOOM_JOIN_URL!, { waitUntil: "domcontentloaded" });

  // Give the UI time to load; CC must be enabled in Zoom for this to work.
  await page.waitForTimeout(3000);

  const ccHandle = await page.waitForSelector(ZOOM_CC_SELECTOR, {
    timeout: 60_000,
  });

  if (!ccHandle) {
    throw new Error(
      `Could not find caption element. Adjust ZOOM_CC_SELECTOR (currently: ${ZOOM_CC_SELECTOR}).`
    );
  }

  // Expose a Node function for the page to call.
  await page.exposeFunction("__pushCaption", async (raw: string) => {
    const text = String(raw ?? "").trim().replace(/\s+/g, " ");
    if (!text) return;
    await postLine(text);
  });

  await attachCaptionObserver(page);

  console.log("Watching captions... (Ctrl+C to stop)");
  // Keep running
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await page.waitForTimeout(10_000);
  }
}

async function attachCaptionObserver(page: Page) {
  await page.evaluate(
    ({ selector }) => {
      const pick = () => document.querySelector(selector) as HTMLElement | null;
      const target = pick();
      if (!target) throw new Error(`No element for selector: ${selector}`);

      let last = "";
      const emit = () => {
        const text = (target.innerText || target.textContent || "")
          .trim()
          .replace(/\s+/g, " ");
        if (!text || text === last) return;
        last = text;
        // @ts-expect-error - injected by exposeFunction
        window.__pushCaption(text);
      };

      const obs = new MutationObserver(() => emit());
      obs.observe(target, {
        subtree: true,
        childList: true,
        characterData: true,
      });

      // Kick once in case captions already exist.
      emit();
    },
    { selector: ZOOM_CC_SELECTOR }
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
