/**
 * Display-related utility functions
 */

/**
 * Get the Tailwind CSS color class based on accuracy percentage
 * >= 70% -> green (good)
 * >= 50% -> yellow (moderate)
 * < 50% -> red (needs attention)
 */
export function getAccuracyColorClass(accuracy: number): string {
  if (accuracy >= 0.7) {
    return "text-green-400";
  }
  if (accuracy >= 0.5) {
    return "text-yellow-400";
  }
  return "text-red-400";
}

/**
 * Format accuracy as a percentage string (e.g., 0.75 -> "75%")
 */
export function formatAccuracyPercent(accuracy: number): string {
  return `${Math.round(accuracy * 100)}%`;
}

/**
 * Check if the lost signal count indicates a spike (needs attention)
 * Default threshold is 3 signals
 */
export function isLostSpike(count: number, threshold: number = 3): boolean {
  return count > threshold;
}

/**
 * Get the Tailwind CSS color class for lost signal count
 * Returns red if it's a spike, white otherwise
 */
export function getLostSignalColorClass(count: number, threshold: number = 3): string {
  return isLostSpike(count, threshold) ? "text-red-400" : "text-white";
}
