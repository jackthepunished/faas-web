import { motion, useReducedMotion } from 'framer-motion';
import type { ElementType } from 'react';
import { EASE } from './reveal';

/**
 * Word-by-word reveal: each word sits inside its own clipping box and rises
 * into it, so the line assembles from behind an edge rather than fading in
 * as a block. A little blur burns off as it lands, which softens the arrival
 * and keeps the stagger from reading as mechanical.
 *
 * Segments let one heading mix styles — a bright clause and a muted one —
 * without losing per-word timing across the whole line.
 */

export interface RevealSegment {
  text: string;
  className?: string;
}

interface TextRevealProps {
  segments: RevealSegment[];
  className?: string;
  /** Element to render. Headings should pass their real level. */
  as?: ElementType;
  /** Seconds before the first word moves. */
  delay?: number;
  /** Seconds between consecutive words. */
  stagger?: number;
}

export function TextReveal({
  segments,
  className = '',
  as: Tag = 'h2',
  delay = 0,
  stagger = 0.032,
}: TextRevealProps) {
  const reduceMotion = useReducedMotion();

  const words = segments.flatMap((segment) =>
    segment.text
      .split(' ')
      .filter(Boolean)
      .map((word) => ({ word, className: segment.className ?? '' }))
  );

  // Reduced motion still gets the styling, just none of the movement.
  if (reduceMotion) {
    return (
      <Tag className={className}>
        {words.map(({ word, className: wc }, i) => (
          <span key={i} className={wc}>
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      {words.map(({ word, className: wordClass }, i) => (
        <span
          key={i}
          // The clip box needs room below the baseline or descenders get
          // shaved; the negative margin gives it back to the line box.
          className="inline-block overflow-hidden pb-[0.14em] align-bottom -mb-[0.14em]"
        >
          <motion.span
            className={`inline-block ${wordClass}`}
            initial={{ y: '115%', opacity: 0, filter: 'blur(6px)' }}
            whileInView={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
            transition={{
              duration: 0.85,
              delay: delay + i * stagger,
              ease: EASE,
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && <span aria-hidden>&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}
