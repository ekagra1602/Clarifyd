/**
 * Unit tests for compression module (Token Company API integration)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compressText, compressPrompts, COMPRESSION_CONFIGS } from "./compression";
import type { AIFeatureType } from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a successful Token Company API response
function createSuccessResponse(output: string, inputTokens = 100, outputTokens = 70) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        output,
        output_tokens: outputTokens,
        original_input_tokens: inputTokens,
        compression_time: 50,
      }),
  };
}

// Helper to create an error response
function createErrorResponse(status: number, body = "Error") {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  };
}

describe("compressText", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set up environment variable
    process.env.TOKEN_COMPANY_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.TOKEN_COMPANY_API_KEY;
  });

  it("should successfully compress text", async () => {
    mockFetch.mockResolvedValueOnce(
      createSuccessResponse("compressed text", 100, 70)
    );

    const result = await compressText("original text", 0.3);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.compressedText).toBe("compressed text");
      expect(result.stats.inputTokens).toBe(100);
      expect(result.stats.outputTokens).toBe(70);
      expect(result.stats.compressionRatio).toBe(0.7);
      expect(result.stats.compressionTimeMs).toBe(50);
    }
  });

  it("should call API with correct parameters", async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse("output", 50, 35));

    await compressText("test input", 0.5);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.thetokencompany.com/v1/compress",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        },
        body: JSON.stringify({
          model: "bear-1",
          input: "test input",
          compression_settings: {
            aggressiveness: 0.5,
          },
        }),
      })
    );
  });

  it("should return error when API key is missing", async () => {
    delete process.env.TOKEN_COMPANY_API_KEY;

    const result = await compressText("test", 0.3);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("API key not configured");
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle 4xx API errors", async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(400, "Bad Request"));

    const result = await compressText("test", 0.3);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("API error: 400");
    }
  });

  it("should handle 5xx API errors", async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(500, "Internal Server Error"));

    const result = await compressText("test", 0.3);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("API error: 500");
    }
  });

  it("should handle network failures", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await compressText("test", 0.3);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Network error");
    }
  });

  it("should clamp aggressiveness to minimum 0", async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse("output", 50, 35));

    await compressText("test", -0.5);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.compression_settings.aggressiveness).toBe(0);
  });

  it("should clamp aggressiveness to maximum 1", async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse("output", 50, 35));

    await compressText("test", 1.5);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.compression_settings.aggressiveness).toBe(1);
  });

  it("should calculate compression ratio correctly", async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse("out", 200, 50));

    const result = await compressText("test", 0.3);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.stats.compressionRatio).toBe(0.25);
    }
  });

  it("should handle zero input tokens gracefully", async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse("", 0, 0));

    const result = await compressText("", 0.3);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.stats.compressionRatio).toBe(1);
    }
  });
});

describe("compressPrompts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TOKEN_COMPANY_API_KEY = "test-api-key";
    process.env.COMPRESSION_ENABLED = "true";
  });

  afterEach(() => {
    delete process.env.TOKEN_COMPANY_API_KEY;
    delete process.env.COMPRESSION_ENABLED;
  });

  it("should compress both system and user prompts", async () => {
    mockFetch
      .mockResolvedValueOnce(createSuccessResponse("compressed system", 100, 70))
      .mockResolvedValueOnce(createSuccessResponse("compressed user", 200, 140));

    const result = await compressPrompts(
      "qa_answer",
      "system prompt",
      "user prompt"
    );

    expect(result.compressedSystem).toBe("compressed system");
    expect(result.compressedUser).toBe("compressed user");
    expect(result.stats).not.toBeNull();
    if (result.stats) {
      expect(result.stats.totalInputTokens).toBe(300);
      expect(result.stats.totalOutputTokens).toBe(210);
    }
  });

  it("should return original prompts when global compression is disabled", async () => {
    process.env.COMPRESSION_ENABLED = "false";

    const result = await compressPrompts(
      "qa_answer",
      "system prompt",
      "user prompt"
    );

    expect(result.compressedSystem).toBe("system prompt");
    expect(result.compressedUser).toBe("user prompt");
    expect(result.stats).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should fallback to original on compression failure", async () => {
    mockFetch
      .mockResolvedValueOnce(createErrorResponse(500, "Error"))
      .mockResolvedValueOnce(createSuccessResponse("compressed user", 100, 70));

    const result = await compressPrompts(
      "qa_answer",
      "system prompt",
      "user prompt"
    );

    expect(result.compressedSystem).toBe("system prompt"); // Original (failed)
    expect(result.compressedUser).toBe("compressed user"); // Compressed (succeeded)
  });

  it("should use feature-specific aggressiveness", async () => {
    mockFetch
      .mockResolvedValueOnce(createSuccessResponse("s", 50, 35))
      .mockResolvedValueOnce(createSuccessResponse("u", 50, 35));

    await compressPrompts("qa_answer", "system", "user");

    const qaConfig = COMPRESSION_CONFIGS.qa_answer;
    const call1Body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const call2Body = JSON.parse(mockFetch.mock.calls[1][1].body);

    expect(call1Body.compression_settings.aggressiveness).toBe(qaConfig.aggressiveness);
    expect(call2Body.compression_settings.aggressiveness).toBe(qaConfig.aggressiveness);
  });

  it("should calculate overall compression ratio", async () => {
    mockFetch
      .mockResolvedValueOnce(createSuccessResponse("s", 100, 50))
      .mockResolvedValueOnce(createSuccessResponse("u", 100, 50));

    const result = await compressPrompts("qa_answer", "system", "user");

    expect(result.stats).not.toBeNull();
    if (result.stats) {
      expect(result.stats.overallRatio).toBe(0.5);
    }
  });
});

describe("COMPRESSION_CONFIGS", () => {
  const featureTypes: AIFeatureType[] = [
    "qa_answer",
    "quiz_generation",
    "question_summary",
    "lost_summary",
  ];

  featureTypes.forEach((featureType) => {
    it(`should have config for ${featureType}`, () => {
      const config = COMPRESSION_CONFIGS[featureType];
      expect(config).toBeDefined();
      expect(typeof config.enabled).toBe("boolean");
      expect(typeof config.aggressiveness).toBe("number");
    });

    it(`${featureType} aggressiveness should be between 0 and 1`, () => {
      const config = COMPRESSION_CONFIGS[featureType];
      expect(config.aggressiveness).toBeGreaterThanOrEqual(0);
      expect(config.aggressiveness).toBeLessThanOrEqual(1);
    });
  });

  it("all features should be enabled by default", () => {
    featureTypes.forEach((featureType) => {
      expect(COMPRESSION_CONFIGS[featureType].enabled).toBe(true);
    });
  });

  it("all features should use 0.7 aggressiveness by default", () => {
    featureTypes.forEach((featureType) => {
      expect(COMPRESSION_CONFIGS[featureType].aggressiveness).toBe(0.7);
    });
  });
});
