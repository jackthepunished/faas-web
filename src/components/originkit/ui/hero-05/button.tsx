// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
  icon?: ReactNode;
};

const BASE_CLASS =
  "group relative inline-flex w-full touch-manipulation items-center justify-center overflow-clip rounded-[12px] border-[0.6px] border-solid px-6 font-clash text-[16px] leading-[21px] capitalize transition-[opacity,transform] duration-200 ease [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 cursor-pointer";

export const Button = ({
  variant = "primary",
  children,
  icon,
  className = "",
  type = "button",
  ...props
}: ButtonProps) => {
  const isSecondary = variant === "secondary";

  return (
    <button
      type={type}
      className={`${BASE_CLASS} ${
        isSecondary
          ? "h-[45px] ipad:h-[48px] border-white py-3 text-white"
          : "h-[53px] ipad:h-[48px] border-[#f6f6f6] py-4 text-black"
      } ${className}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className={
          isSecondary
            ? "pointer-events-none absolute inset-0 rounded-[12px] bg-[linear-gradient(97deg,#000_-31.45%,#323232_54.98%,#282828_100%)]"
            : "pointer-events-none absolute inset-0 rounded-[12px] bg-white"
        }
      />

      <span className="relative z-[1] inline-flex items-center gap-2.5">
        <span className="ipad:text-[18px]">{children}</span>
        {icon}
      </span>

      <span
        aria-hidden="true"
        className={
          isSecondary
            ? "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_4px_4px_0_rgba(255,255,255,0.25)]"
            : "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_5px_0_rgba(255,255,255,0.1)]"
        }
      />
    </button>
  );
};
