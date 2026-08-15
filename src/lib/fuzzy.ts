/**
 * Subsequence matching for the command palette.
 *
 * A plain `includes` check means "deploy new" only ever matches a literal
 * substring — the way people actually type into a palette ("depnew", "dnw")
 * finds nothing. This matches characters in order with gaps allowed, and
 * scores by *how* they matched so the tight, word-initial hits sort above the
 * ones that happened to scatter their letters across the string.
 */

export interface FuzzyMatch {
  score: number;
  /** Indices in the haystack that matched, for highlighting. */
  indices: number[];
}

const SCORE_CONSECUTIVE = 8;
const SCORE_WORD_START = 10;
const SCORE_FIRST_CHAR = 12;
const PENALTY_GAP = -1;
const PENALTY_LEADING = -3;

function isBoundary(prev: string | undefined): boolean {
  if (prev === undefined) return true;
  return prev === ' ' || prev === '-' || prev === '_' || prev === '/' || prev === '.';
}

/**
 * Greedy left-to-right match. Greedy is the wrong answer in a small number of
 * cases (it can take an early character that strands a later one), but it is
 * linear and the palette re-runs this on every keystroke across every command
 * — an optimal matcher is not worth the frame budget here.
 */
export function fuzzyMatch(haystack: string, needle: string): FuzzyMatch | null {
  if (!needle) return { score: 0, indices: [] };

  const hay = haystack.toLowerCase();
  const query = needle.toLowerCase();

  const indices: number[] = [];
  let score = 0;
  let hayIndex = 0;
  let lastMatch = -1;

  for (const char of query) {
    const found = hay.indexOf(char, hayIndex);
    if (found === -1) return null;

    if (found === lastMatch + 1 && lastMatch !== -1) score += SCORE_CONSECUTIVE;
    if (isBoundary(hay[found - 1])) score += found === 0 ? SCORE_FIRST_CHAR : SCORE_WORD_START;
    // Every skipped character costs a little, so a match that stays tight
    // outranks one strung across the whole label.
    if (lastMatch !== -1) score += (found - lastMatch - 1) * PENALTY_GAP;
    else score += found * PENALTY_LEADING;

    indices.push(found);
    lastMatch = found;
    hayIndex = found + 1;
  }

  // Shorter haystacks win ties: "Logs" should beat "Build logs" for "logs".
  score -= haystack.length * 0.1;

  return { score, indices };
}

/**
 * Splits `text` into matched and unmatched runs so a caller can render the
 * matched characters differently. Returns whole runs rather than one segment
 * per character, so highlighting does not litter the DOM with spans.
 */
export function highlightSegments(
  text: string,
  indices: number[]
): { text: string; match: boolean }[] {
  if (indices.length === 0) return [{ text, match: false }];

  const hit = new Set(indices);
  const segments: { text: string; match: boolean }[] = [];

  let start = 0;
  let current = hit.has(0);

  for (let i = 1; i <= text.length; i++) {
    const next = i < text.length && hit.has(i);
    if (next !== current || i === text.length) {
      segments.push({ text: text.slice(start, i), match: current });
      start = i;
      current = next;
    }
  }

  return segments;
}
