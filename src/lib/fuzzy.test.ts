import { describe, expect, it } from 'vitest';
import { fuzzyMatch, highlightSegments } from './fuzzy';

/** Ranks a set of labels the way the palette does, best first. */
function rank(labels: string[], query: string): string[] {
  return labels
    .map((label) => ({ label, match: fuzzyMatch(label, query) }))
    .filter((r) => r.match !== null)
    .sort((a, b) => b.match!.score - a.match!.score)
    .map((r) => r.label);
}

describe('fuzzyMatch', () => {
  it('matches a plain substring', () => {
    expect(fuzzyMatch('Deployments', 'deploy')).not.toBeNull();
  });

  it('matches characters in order with gaps between them', () => {
    // The whole point of the change: this is what people type into a palette.
    expect(fuzzyMatch('Deploy a new workflow', 'dnw')).not.toBeNull();
    expect(fuzzyMatch('Environment variables', 'envvar')).not.toBeNull();
  });

  it('is case insensitive in both directions', () => {
    expect(fuzzyMatch('API Keys', 'api')).not.toBeNull();
    expect(fuzzyMatch('api keys', 'API')).not.toBeNull();
  });

  it('returns null when a character is missing or out of order', () => {
    expect(fuzzyMatch('Logs', 'zzz')).toBeNull();
    expect(fuzzyMatch('Logs', 'lg s')).toBeNull();
    // Right characters, wrong order.
    expect(fuzzyMatch('Logs', 'sgol')).toBeNull();
  });

  it('treats an empty query as matching with nothing highlighted', () => {
    expect(fuzzyMatch('Logs', '')).toEqual({ score: 0, indices: [] });
  });

  it('reports the indices it matched', () => {
    expect(fuzzyMatch('Logs', 'lg')?.indices).toEqual([0, 2]);
  });

  describe('ranking', () => {
    it('puts an exact shorter label above a longer one containing it', () => {
      expect(rank(['Build logs', 'Logs'], 'logs')[0]).toBe('Logs');
    });

    it('prefers a word-initial match over a mid-word one', () => {
      expect(rank(['Deployments', 'Deploy a new workflow'], 'dep')[0]).toBe('Deployments');
    });

    it('prefers consecutive characters over scattered ones', () => {
      const [best] = rank(['Workflows', 'Deploy a new workflow'], 'wf');
      expect(best).toBe('Workflows');
    });

    it('scores a tight match above a strung-out one for the same needle', () => {
      const tight = fuzzyMatch('workflow', 'wf')!;
      const loose = fuzzyMatch('w-------------------f', 'wf')!;
      expect(tight.score).toBeGreaterThan(loose.score);
    });
  });
});

describe('highlightSegments', () => {
  it('returns the whole string unmatched when nothing matched', () => {
    expect(highlightSegments('Logs', [])).toEqual([{ text: 'Logs', match: false }]);
  });

  it('groups adjacent matches into one run rather than one span per character', () => {
    expect(highlightSegments('Logs', [0, 1])).toEqual([
      { text: 'Lo', match: true },
      { text: 'gs', match: false },
    ]);
  });

  it('marks a match at the very end', () => {
    expect(highlightSegments('Logs', [3])).toEqual([
      { text: 'Log', match: false },
      { text: 's', match: true },
    ]);
  });

  it('reconstructs the original string exactly', () => {
    for (const [text, query] of [
      ['Deploy a new workflow', 'dnw'],
      ['Environment variables', 'envvar'],
      ['API Keys', 'apik'],
      ['Logs', 'logs'],
    ] as const) {
      const match = fuzzyMatch(text, query)!;
      const rebuilt = highlightSegments(text, match.indices)
        .map((s) => s.text)
        .join('');
      expect(rebuilt).toBe(text);
    }
  });
});
