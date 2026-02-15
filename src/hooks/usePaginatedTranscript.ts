import { useQuery } from "convex/react";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type TranscriptLine = {
  _id: string;
  text: string;
  createdAt: number;
  sessionId: Id<"sessions">;
};

type PaginatedTranscriptResult = {
  /** All loaded transcript lines in chronological order */
  lines: TranscriptLine[];
  /** Whether more older lines can be loaded */
  hasMore: boolean;
  /** Whether older lines are currently being fetched */
  isLoadingMore: boolean;
  /** Load older transcript lines */
  loadMore: () => void;
  /** Total lines loaded so far */
  totalLoaded: number;
};

const INITIAL_LIMIT = 50;
const LOAD_MORE_LIMIT = 30;

/**
 * Hook for managing paginated transcript loading with real-time updates.
 *
 * Strategy:
 * - Uses a single paginated query that fetches recent lines
 * - Maintains local state for older loaded lines
 * - Merges real-time updates with loaded history
 * - Supports "load more" for infinite scroll
 */
export function usePaginatedTranscript(
  sessionId: Id<"sessions">
): PaginatedTranscriptResult {
  // Track the oldest timestamp we've loaded (cursor for pagination)
  const [oldestLoadedTimestamp, setOldestLoadedTimestamp] = useState<
    number | undefined
  >(undefined);

  // Track older lines that have been paginated in
  const [olderLines, setOlderLines] = useState<TranscriptLine[]>([]);

  // Track if we're currently loading more
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track if there are more older lines to load
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  // Ref to track if initial load has happened
  const initialLoadDone = useRef(false);

  // Fetch recent lines (real-time subscription)
  const recentResult = useQuery(api.transcripts.listTranscriptPaginated, {
    sessionId,
    limit: INITIAL_LIMIT,
  });

  // Query for older lines (only when loadMore is triggered)
  const olderResult = useQuery(
    api.transcripts.listTranscriptPaginated,
    oldestLoadedTimestamp !== undefined && isLoadingMore
      ? {
          sessionId,
          limit: LOAD_MORE_LIMIT,
          beforeTimestamp: oldestLoadedTimestamp,
        }
      : "skip"
  );

  // Process older lines when they arrive
  useEffect(() => {
    if (olderResult && isLoadingMore) {
      setOlderLines((prev) => {
        // Prepend older lines (they come in chronological order)
        const newLines = olderResult.lines.filter(
          (line) => !prev.some((p) => p._id === line._id)
        );
        return [...newLines, ...prev];
      });

      // Update cursor to the oldest timestamp from this batch
      if (olderResult.oldestTimestamp !== undefined) {
        setOldestLoadedTimestamp(olderResult.oldestTimestamp);
      }

      setHasMoreOlder(olderResult.hasMore);
      setIsLoadingMore(false);
    }
  }, [olderResult, isLoadingMore]);

  // Set initial cursor when recent lines first load
  useEffect(() => {
    if (recentResult && !initialLoadDone.current) {
      initialLoadDone.current = true;

      if (recentResult.oldestTimestamp !== undefined) {
        setOldestLoadedTimestamp(recentResult.oldestTimestamp);
      }
      setHasMoreOlder(recentResult.hasMore);
    }
  }, [recentResult]);

  // Merge older lines with recent lines, deduplicating by _id
  const lines = useMemo(() => {
    const recentLines = recentResult?.lines ?? [];

    // Create a map for deduplication
    const lineMap = new Map<string, TranscriptLine>();

    // Add older lines first
    for (const line of olderLines) {
      lineMap.set(line._id, line);
    }

    // Add recent lines (will overwrite any duplicates)
    for (const line of recentLines) {
      lineMap.set(line._id, line);
    }

    // Convert to array and sort by createdAt
    return Array.from(lineMap.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
  }, [recentResult?.lines, olderLines]);

  // Load more callback
  const loadMore = useCallback(() => {
    if (!hasMoreOlder || isLoadingMore || oldestLoadedTimestamp === undefined) {
      return;
    }
    setIsLoadingMore(true);
  }, [hasMoreOlder, isLoadingMore, oldestLoadedTimestamp]);

  return {
    lines,
    hasMore: hasMoreOlder,
    isLoadingMore,
    loadMore,
    totalLoaded: lines.length,
  };
}
