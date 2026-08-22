import { describe, expect, it } from 'vitest';
import { parseFrame } from './logs';

/**
 * The spec documents the stream as structured and names a `level` field and an
 * `instance_id` field, but never gives the frame's schema. These assertions pin
 * down the contract the parser actually promises: use what is there, and never
 * lose a line to a shape it did not expect.
 */
describe('parseFrame', () => {
  const at = 1_700_000_000_000;

  it('reads the fields the spec names', () => {
    const line = parseFrame(
      JSON.stringify({
        level: 'warn',
        instance_id: 'inst-42',
        msg: 'upstream slow',
        ts: '2026-08-22T01:00:00Z',
      }),
      'l0',
      at
    );
    expect(line.level).toBe('warn');
    expect(line.instanceId).toBe('inst-42');
    expect(line.text).toBe('upstream slow');
    expect(line.ts).toBe(Date.parse('2026-08-22T01:00:00Z'));
  });

  it('accepts the message and level names structured loggers actually use', () => {
    expect(parseFrame('{"message":"a","severity":"WARNING"}', 'l0', at).level).toBe('warn');
    expect(parseFrame('{"line":"b","level":"FATAL"}', 'l0', at).level).toBe('error');
    expect(parseFrame('{"text":"c"}', 'l0', at).text).toBe('c');
  });

  it('keeps a plain-text frame whole, and still finds its level', () => {
    const raw = '2026-08-22 01:00:00 ERROR api-gateway handler panic';
    const line = parseFrame(raw, 'l0', at);
    expect(line.text).toBe(raw);
    expect(line.level).toBe('error');
    expect(line.ts).toBe(at);
  });

  it('does not lose a frame that looks like JSON and is not', () => {
    const raw = '{"level":"info", truncated…';
    const line = parseFrame(raw, 'l0', at);
    expect(line.text).toBe(raw);
    expect(line.raw).toBe(raw);
  });

  it('falls back to when the line arrived if the frame has no usable timestamp', () => {
    expect(parseFrame('{"msg":"x","ts":"not a date"}', 'l0', at).ts).toBe(at);
  });

  it('handles seconds-since-epoch as well as milliseconds', () => {
    expect(parseFrame('{"msg":"x","ts":1700000000}', 'l0', at).ts).toBe(1_700_000_000_000);
  });

  it('leaves level undefined rather than guessing', () => {
    expect(parseFrame('{"msg":"plain"}', 'l0', at).level).toBeUndefined();
    expect(parseFrame('nothing notable here', 'l0', at).level).toBeUndefined();
  });
});
