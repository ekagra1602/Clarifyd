"use node";

import {
  AIFeatureType,
  CompressionConfig,
  CompressionResult,
  CompressionStats,
} from "./types";

// ==========================================
// Token Company API Configuration
// ==========================================

const TOKEN_COMPANY_API_URL = "https://api.thetokencompany.com/v1/compress";
const TOKEN_COMPANY_MODEL = "bear-1";

// ==========================================
// Feature-Specific Compression Configs
// ==========================================

/**
 * In-code feature flags for compression.
 * Toggle enabled/aggressiveness per feature type.
 */
export const COMPRESSION_CONFIGS: Record<AIFeatureType, CompressionConfig> = {
  qa_answer: { enabled: true, aggressiveness: 0.7 },
  quiz_generation: { enabled: true, aggressiveness: 0.7 },
  question_summary: { enabled: true, aggressiveness: 0.7 },
  lost_summary: { enabled: true, aggressiveness: 0.7 },
};

// ==========================================
// Token Company API Response Types
// ==========================================

interface TokenCompanyResponse {
  output: string;
  output_tokens: number;
  original_input_tokens: number;
  compression_time: number;
}

// ==========================================
// Core Compression Function
// ==========================================

/**
 * Compress a single text using Token Company API.
 * Returns the original text on any error (graceful fallback).
 */
export async function compressText(
  text: string,
  aggressiveness: number
): Promise<CompressionResult> {
  const apiKey = process.env.TOKEN_COMPANY_API_KEY;

  if (!apiKey) {
    console.warn("TOKEN_COMPANY_API_KEY not set, skipping compression");
    return { success: false, error: "API key not configured" };
  }

  // Clamp aggressiveness to valid range
  const clampedAggressiveness = Math.max(0, Math.min(1, aggressiveness));

  try {
    const response = await fetch(TOKEN_COMPANY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TOKEN_COMPANY_MODEL,
        input: text,
        compression_settings: {
          aggressiveness: clampedAggressiveness,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Token Company API error:", response.status, errorBody);
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as TokenCompanyResponse;

    const stats: CompressionStats = {
      inputTokens: data.original_input_tokens,
      outputTokens: data.output_tokens,
      compressionTimeMs: data.compression_time,
      compressionRatio:
        data.original_input_tokens > 0
          ? data.output_tokens / data.original_input_tokens
          : 1,
    };

    return {
      success: true,
      compressedText: data.output,
      stats,
    };
  } catch (error) {
    console.error("Token Company API call failed:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}

// ==========================================
// Prompt Compression Helper
// ==========================================

export interface CompressedPrompts {
  compressedSystem: string;
  compressedUser: string;
  stats: {
    systemStats?: CompressionStats;
    userStats?: CompressionStats;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCompressionTimeMs: number;
    overallRatio: number;
  } | null;
}

/**
 * Compress both system and user prompts for a given feature.
 * Falls back to original prompts on any error.
 */
export async function compressPrompts(
  featureType: AIFeatureType,
  systemPrompt: string,
  userPrompt: string
): Promise<CompressedPrompts> {
  const config = COMPRESSION_CONFIGS[featureType];

  // Check global kill switch
  const globalEnabled = process.env.COMPRESSION_ENABLED !== "false";

  if (!globalEnabled || !config.enabled) {
    return {
      compressedSystem: systemPrompt,
      compressedUser: userPrompt,
      stats: null,
    };
  }

  // Compress both prompts in parallel
  const [systemResult, userResult] = await Promise.all([
    compressText(systemPrompt, config.aggressiveness),
    compressText(userPrompt, config.aggressiveness),
  ]);

  // Calculate combined stats
  let stats: CompressedPrompts["stats"] = null;
  if (systemResult.success || userResult.success) {
    const systemStats = systemResult.success ? systemResult.stats : undefined;
    const userStats = userResult.success ? userResult.stats : undefined;

    const totalInputTokens =
      (systemStats?.inputTokens ?? 0) + (userStats?.inputTokens ?? 0);
    const totalOutputTokens =
      (systemStats?.outputTokens ?? 0) + (userStats?.outputTokens ?? 0);
    const totalCompressionTimeMs =
      (systemStats?.compressionTimeMs ?? 0) +
      (userStats?.compressionTimeMs ?? 0);

    stats = {
      systemStats,
      userStats,
      totalInputTokens,
      totalOutputTokens,
      totalCompressionTimeMs,
      overallRatio: totalInputTokens > 0 ? totalOutputTokens / totalInputTokens : 1,
    };

    // Log compression stats for monitoring
    console.log(`[Compression] ${featureType}:`, {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      ratio: (stats.overallRatio * 100).toFixed(1) + "%",
      timeMs: totalCompressionTimeMs,
    });
  }

  return {
    compressedSystem: systemResult.success
      ? systemResult.compressedText
      : systemPrompt,
    compressedUser: userResult.success ? userResult.compressedText : userPrompt,
    stats,
  };
}
