"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_VEO_MODEL = "veo-3.1-fast-generate-preview";
const GOOGLE_GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function formatHttpError(response: Response, context: string): Promise<string> {
  const body = (await response.text()).trim();
  const contentType = response.headers.get("content-type") || "unknown";
  const bodyMessage = body || "No response body returned";
  return `${context} (status=${response.status}, contentType=${contentType}): ${bodyMessage}`;
}

function compactTranscript(transcript: string, maxChars = 4500): string {
  if (!transcript) return "";
  return transcript.length > maxChars
    ? transcript.slice(transcript.length - maxChars)
    : transcript;
}

async function convertToVeoPromptWithClaude(args: {
  apiKey: string;
  sourcePrompt: string;
  sessionContext?: string;
}): Promise<{ success: true; prompt: string } | { success: false; error: string }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": args.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL,
        temperature: 0.5,
        max_tokens: 500,
        system:
          "You convert educational student requests into production-ready prompts for Veo video generation. " +
          "Return only the final prompt text with rich visual detail, camera movement, style, pacing, and educational clarity. " +
          "Do not output markdown or JSON.",
        messages: [
          {
            role: "user",
            content: [
              `Student request:\n${args.sourcePrompt}`,
              args.sessionContext
                ? `\nLecture transcript context:\n${args.sessionContext}`
                : "",
              "\nMake the video prompt concise, vivid, and safe for classroom content.",
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `Claude error ${response.status}: ${body}` };
    }

    const data = await response.json();
    const prompt =
      data?.content
        ?.filter((block: { type?: string; text?: string }) => block.type === "text")
        ?.map((block: { text?: string }) => block.text ?? "")
        ?.join("\n")
        ?.trim() ?? "";

    if (!prompt) {
      return { success: false, error: "Claude returned an empty video prompt" };
    }

    return { success: true, prompt };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function generateVideoWithVeo(
  optimizedPrompt: string
): Promise<
  | { success: true; videoUrl: string; provider: string; providerRequestId?: string }
  | { success: false; error: string }
> {
  const veoApiKey = process.env.VEO_API_KEY;
  const veoModel = process.env.VEO_MODEL || DEFAULT_VEO_MODEL;

  if (!veoApiKey) {
    return {
      success: false,
      error: "VEO_API_KEY not configured. Set it in Convex environment variables.",
    };
  }

  try {
    const generateUrl = `${GOOGLE_GEMINI_API_BASE}/models/${encodeURIComponent(veoModel)}:predictLongRunning`;
    const response = await fetch(generateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": veoApiKey,
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: optimizedPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const message = await formatHttpError(
        response,
        `Veo predictLongRunning failed for model=${veoModel} url=${generateUrl}`
      );
      return { success: false, error: message };
    }

    let operation = await response.json();
    const requestId = operation?.name || operation?.id;

    // Poll long-running operation until done (up to ~4 minutes).
    for (let attempt = 0; attempt < 12 && !operation?.done; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 20000));
      if (!operation?.name) break;
      const pollUrl = `${GOOGLE_GEMINI_API_BASE}/${operation.name}`;

      const pollRes = await fetch(pollUrl, {
        method: "GET",
        headers: {
          "x-goog-api-key": veoApiKey,
        },
      });

      if (!pollRes.ok) {
        const message = await formatHttpError(
          pollRes,
          `Veo operation poll failed for model=${veoModel} url=${pollUrl}`
        );
        return { success: false, error: message };
      }

      operation = await pollRes.json();
    }

    // Extract video URL from all known Veo response shapes
    const resp = operation?.response;
    const rawVideoUrl =
      // Actual shape: response.generateVideoResponse.generatedSamples[0].video.uri
      resp?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
      resp?.generateVideoResponse?.generatedSamples?.[0]?.video?.url ||
      // SDK-style: response.generatedVideos[0].video.uri
      resp?.generatedVideos?.[0]?.video?.uri ||
      resp?.generated_videos?.[0]?.video?.uri ||
      // Direct on operation
      operation?.generatedVideos?.[0]?.video?.uri ||
      operation?.generated_videos?.[0]?.video?.uri ||
      // Predictions style
      resp?.predictions?.[0]?.video?.uri ||
      // Fallbacks
      resp?.videoUrl ||
      operation?.videoUrl ||
      null;

    // Append API key to Google download URLs so they work in a browser
    let videoUrl = rawVideoUrl;
    if (
      typeof videoUrl === "string" &&
      videoUrl.includes("generativelanguage.googleapis.com")
    ) {
      const separator = videoUrl.includes("?") ? "&" : "?";
      videoUrl = `${videoUrl}${separator}key=${encodeURIComponent(veoApiKey)}`;
    }

    if (!operation?.done) {
      return { success: false, error: "Veo generation timed out before completion." };
    }

    // Check for safety/content moderation filters
    const videoResponse = resp?.generateVideoResponse;
    const filteredReasons = videoResponse?.raiMediaFilteredReasons;
    if (Array.isArray(filteredReasons) && filteredReasons.length > 0) {
      return {
        success: false,
        error: `Video blocked by content filter: ${filteredReasons.join("; ")}`,
      };
    }

    if (!videoUrl) {
      const operationPreview = JSON.stringify(operation, null, 2).slice(0, 1200);
      return {
        success: false,
        error:
          "Veo completed but did not return a video URL. " +
          `model=${veoModel} operationPreview=${operationPreview}`,
      };
    }

    return {
      success: true,
      videoUrl,
      provider: "veo-3.1",
      providerRequestId: requestId,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export const processVideoRequest = internalAction({
  args: { requestId: v.id("videoRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.runQuery(internal.videos.getVideoRequestInternal, {
      requestId: args.requestId,
    });

    if (!request) {
      return;
    }

    await ctx.runMutation(internal.videos.updateVideoRequestStatusInternal, {
      requestId: request._id,
      status: "processing",
      error: undefined,
    });

    const claudeApiKey = process.env.CLAUDE_API_KEY;
    if (!claudeApiKey) {
      await ctx.runMutation(internal.videos.updateVideoRequestStatusInternal, {
        requestId: request._id,
        status: "failed",
        error: "CLAUDE_API_KEY is not configured in Convex environment variables.",
      });
      return;
    }

    const sessionContext = await ctx.runQuery(api.sessions.getSessionContext, {
      sessionId: request.sessionId,
    });

    const transcriptContext =
      request.triggerType === "transcript"
        ? compactTranscript(sessionContext?.transcript ?? "")
        : undefined;

    const claudePromptResult = await convertToVeoPromptWithClaude({
      apiKey: claudeApiKey,
      sourcePrompt: request.sourcePrompt,
      sessionContext: transcriptContext,
    });

    if (!claudePromptResult.success) {
      await ctx.runMutation(internal.videos.updateVideoRequestStatusInternal, {
        requestId: request._id,
        status: "failed",
        error: claudePromptResult.error,
      });
      return;
    }

    const veoResult = await generateVideoWithVeo(claudePromptResult.prompt);
    if (!veoResult.success) {
      await ctx.runMutation(internal.videos.updateVideoRequestStatusInternal, {
        requestId: request._id,
        status: "failed",
        optimizedPrompt: claudePromptResult.prompt,
        error: veoResult.error,
      });
      return;
    }

    await ctx.runMutation(internal.videos.updateVideoRequestStatusInternal, {
      requestId: request._id,
      status: "completed",
      optimizedPrompt: claudePromptResult.prompt,
      provider: veoResult.provider,
      videoUrl: veoResult.videoUrl,
      providerRequestId: veoResult.providerRequestId,
      error: undefined,
    });
  },
});
