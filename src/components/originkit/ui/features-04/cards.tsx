// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import type { ReactNode } from "react";

import { AsciiArt } from "@/components/originkit/ui/features-04/ascii-art";

/**
 * Figma "Frame 2147261828" / "Frame 2147257816" — every tile in the column is
 * the same two-layer plate: a #ebebeb tray with 8px of padding holding a
 * #f5f5f5 card, 20px and 16px radii. The card's only lift is a 6px #ddd drop
 * shadow, which has to be a drop-shadow rather than a box-shadow because Figma
 * spreads it off the rounded silhouette. None of that changes across the three
 * frames — what changes is the height the plate is asked to fill, so the tray
 * is a flex column and each caller passes the classes for its own layer.
 */
export const Plate = ({
  children,
  outerClassName = "",
  innerClassName,
}: {
  children: ReactNode;
  outerClassName?: string;
  innerClassName: string;
}) => (
  <div
    className={`flex flex-col rounded-[20px] bg-[#ebebeb] p-[8px] ${outerClassName}`}
  >
    <div
      className={`flex rounded-[16px] bg-[#f5f5f5] drop-shadow-[0px_0px_6px_#ddd] ${innerClassName}`}
    >
      {children}
    </div>
  </div>
);

/** Title over body. 18/14 through tablet, 20/16 once the cards go three-up. */
const CardText = ({ title, body }: { title: string; body: string }) => (
  <div className="flex w-full flex-col gap-[12px] font-tight leading-[1.2] text-black">
    <h3 className="text-[18px] font-medium desktop-sm:text-[20px]">{title}</h3>
    <p className="text-[14px] opacity-60 desktop-sm:text-[16px]">{body}</p>
  </div>
);

interface Art {
  src: string;
  alt: string;
  boxClassName: string;
  artClassName: string;
}

/**
 * Figma "Frame 2147262225" (2356:158 / 2356:166) — Focus and Connect. Artwork
 * over a title and a paragraph, with the 20px below the art carried as padding
 * on the art's own row so the 10px gap stays the same as on the stat rows.
 *
 * From tablet up the plate is pinned to 373px and the card fills it, which is
 * what lets the two stacks in a row come out level.
 */
export const FeatureCard = ({
  title,
  body,
  art,
}: {
  title: string;
  body: string;
  art: Art;
}) => (
  <Plate
    outerClassName="ipad:h-[373px]"
    innerClassName="flex-col gap-[10px] px-[20px] pt-[12px] pb-[20px] ipad:min-h-px ipad:flex-1 ipad:justify-end"
  >
    <div className="flex w-full flex-col items-center justify-center pb-[20px]">
      <AsciiArt {...art} />
    </div>
    <CardText title={title} body={body} />
  </Plate>
);

/**
 * Figma "Frame 2147262225" (2356:180 / 2356:332 / 2356:469) — Scale. The same
 * card, but it is the one that changes shape: full width under the pair on
 * phone and tablet, then a third column on desktop where it stretches to the
 * other stacks' 481px and spreads its art and copy apart. Its top padding
 * walks 12 -> 20 -> 32 as it gets taller.
 */
export const WideCard = ({
  title,
  body,
  art,
}: {
  title: string;
  body: string;
  art: Art;
}) => (
  <Plate
    outerClassName="desktop-sm:h-full"
    innerClassName="flex-col items-center gap-[10px] px-[20px] pt-[12px] pb-[20px] ipad:pt-[20px] desktop-sm:min-h-px desktop-sm:flex-1 desktop-sm:justify-between desktop-sm:pt-[32px]"
  >
    <div className="flex w-full flex-col items-center justify-center pb-[20px]">
      <AsciiArt {...art} />
    </div>
    <CardText title={title} body={body} />
  </Plate>
);
