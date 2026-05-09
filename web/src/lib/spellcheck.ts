/**
 * GUMA BASKET Fuzzy Spell Checker
 * Uses Levenshtein distance to find closest matching product names.
 */

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Given a user query and a list of product titles,
 * returns the closest matching title if within a threshold.
 */
export function findClosestMatch(query: string, titles: string[]): string | null {
  if (!query || titles.length === 0) return null;
  
  const q = query.toLowerCase().trim();
  
  // First check for partial substring match (don't need a suggestion if something already works)
  const hasPartialMatch = titles.some(t => t.toLowerCase().includes(q));
  if (hasPartialMatch) return null;
  
  let bestMatch: string | null = null;
  let bestScore = Infinity;
  
  for (const title of titles) {
    const t = title.toLowerCase();
    // Compare against each word in the title too
    const words = t.split(/\s+/);
    const scores = [levenshtein(q, t), ...words.map(w => levenshtein(q, w))];
    const minScore = Math.min(...scores);
    
    if (minScore < bestScore) {
      bestScore = minScore;
      bestMatch = title;
    }
  }
  
  // Only suggest if close enough (within 3 edits or < 40% of query length)
  const threshold = Math.max(3, Math.floor(q.length * 0.4));
  return bestScore <= threshold ? bestMatch : null;
}
