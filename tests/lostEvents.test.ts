import { describe, it, expect } from 'vitest';

// Time bucket calculation logic (extracted for testing)
interface LostEvent {
  createdAt: number;
}

function calculateLostSpikeStats(events: LostEvent[], now: number) {
  const oneMinuteAgo = now - 60 * 1000;
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  // Filter events to last 5 minutes
  const recentEvents = events.filter((e) => e.createdAt >= fiveMinutesAgo);

  // Count events in different time windows
  const last60sCount = recentEvents.filter(
    (e) => e.createdAt >= oneMinuteAgo
  ).length;
  const last5mCount = recentEvents.length;

  // Create time buckets (30-second intervals for last 5 minutes = 10 buckets)
  const bucketSize = 30 * 1000; // 30 seconds
  const bucketCount = 10;
  const buckets: { start: number; end: number; count: number }[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const bucketEnd = now - i * bucketSize;
    const bucketStart = bucketEnd - bucketSize;
    const count = recentEvents.filter(
      (e) => e.createdAt >= bucketStart && e.createdAt < bucketEnd
    ).length;
    buckets.unshift({ start: bucketStart, end: bucketEnd, count });
  }

  return {
    last60sCount,
    last5mCount,
    buckets,
  };
}

describe('calculateLostSpikeStats', () => {
  const NOW = 1700000000000; // Fixed timestamp for testing

  it('should return zero counts for no events', () => {
    const stats = calculateLostSpikeStats([], NOW);

    expect(stats.last60sCount).toBe(0);
    expect(stats.last5mCount).toBe(0);
    expect(stats.buckets).toHaveLength(10);
    expect(stats.buckets.every((b) => b.count === 0)).toBe(true);
  });

  it('should count events in the last 60 seconds', () => {
    const events: LostEvent[] = [
      { createdAt: NOW - 30 * 1000 }, // 30s ago
      { createdAt: NOW - 45 * 1000 }, // 45s ago
      { createdAt: NOW - 90 * 1000 }, // 90s ago (outside 60s window)
    ];
    const stats = calculateLostSpikeStats(events, NOW);

    expect(stats.last60sCount).toBe(2);
    expect(stats.last5mCount).toBe(3);
  });

  it('should exclude events older than 5 minutes', () => {
    const events: LostEvent[] = [
      { createdAt: NOW - 30 * 1000 },      // 30s ago
      { createdAt: NOW - 4 * 60 * 1000 },  // 4m ago
      { createdAt: NOW - 6 * 60 * 1000 },  // 6m ago (outside 5m window)
      { createdAt: NOW - 10 * 60 * 1000 }, // 10m ago (outside 5m window)
    ];
    const stats = calculateLostSpikeStats(events, NOW);

    expect(stats.last5mCount).toBe(2);
  });

  it('should create 10 buckets of 30 seconds each', () => {
    const stats = calculateLostSpikeStats([], NOW);

    expect(stats.buckets).toHaveLength(10);

    // Check bucket sizes
    for (const bucket of stats.buckets) {
      expect(bucket.end - bucket.start).toBe(30 * 1000);
    }
  });

  it('should place events in correct buckets', () => {
    // Event at 15 seconds ago should be in the most recent bucket
    const events: LostEvent[] = [
      { createdAt: NOW - 15 * 1000 },  // Should be in bucket 9 (most recent)
      { createdAt: NOW - 45 * 1000 },  // Should be in bucket 8
      { createdAt: NOW - 75 * 1000 },  // Should be in bucket 7
    ];
    const stats = calculateLostSpikeStats(events, NOW);

    // Most recent bucket (index 9) covers [NOW - 30s, NOW)
    expect(stats.buckets[9].count).toBe(1);
    // Second most recent bucket (index 8) covers [NOW - 60s, NOW - 30s)
    expect(stats.buckets[8].count).toBe(1);
    // Third bucket (index 7) covers [NOW - 90s, NOW - 60s)
    expect(stats.buckets[7].count).toBe(1);
  });

  it('should detect spikes (multiple events in single bucket)', () => {
    // Spike of 5 events in the last 30 seconds
    const events: LostEvent[] = [
      { createdAt: NOW - 5 * 1000 },
      { createdAt: NOW - 10 * 1000 },
      { createdAt: NOW - 15 * 1000 },
      { createdAt: NOW - 20 * 1000 },
      { createdAt: NOW - 25 * 1000 },
    ];
    const stats = calculateLostSpikeStats(events, NOW);

    expect(stats.buckets[9].count).toBe(5); // All 5 in the most recent bucket
    expect(stats.last60sCount).toBe(5);
  });

  it('should handle edge case of event exactly at bucket boundary', () => {
    // Event exactly at 30 seconds ago
    const events: LostEvent[] = [
      { createdAt: NOW - 30 * 1000 }, // Exactly at boundary
    ];
    const stats = calculateLostSpikeStats(events, NOW);

    // Bucket 9 covers [NOW-30s, NOW) with inclusive start (>=)
    // So event at exactly NOW-30s IS in bucket 9
    expect(stats.buckets[9].count).toBe(1);
    expect(stats.buckets[8].count).toBe(0);
  });

  it('should return buckets in chronological order (oldest first)', () => {
    const stats = calculateLostSpikeStats([], NOW);

    // First bucket should be the oldest (5 minutes ago)
    expect(stats.buckets[0].end).toBeLessThan(stats.buckets[9].end);

    // Each bucket should be more recent than the previous
    for (let i = 1; i < stats.buckets.length; i++) {
      expect(stats.buckets[i].start).toBeGreaterThan(stats.buckets[i - 1].start);
    }
  });
});
