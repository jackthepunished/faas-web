// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

"use client";

/** Public asset URLs — use a function so preview rewriters stay stable. */
function asset(file: string) {
  return `/originkit/hero-05/${file}`;
}

type NavLink = {
  label: string;
  href: string;
  hasDropdown?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { label: "Platform", href: "#platform" },
  { label: "Products", href: "#products", hasDropdown: true },
  { label: "Resources", href: "#resources", hasDropdown: true },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact Us", href: "#contact" },
];

const LINK_CLASS =
  "inline-flex min-h-11 items-center gap-1 font-outfit text-[16px] font-normal leading-[1.5] tracking-[-0.32px] text-white touch-manipulation whitespace-nowrap transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-80";

const Logo = () => (
  <a
    href="#"
    aria-label="Agentic home"
    className="inline-flex min-h-11 items-center gap-2 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent]"
  >
    <img
      src={asset("nav-logo.svg")}
      alt=""
      width={43}
      height={42}
      className="h-[42px] w-[43px] shrink-0"
      aria-hidden="true"
    />
    <span className="font-audiowide text-[22px] leading-[1.5] text-white whitespace-nowrap">
      Agentic
    </span>
  </a>
);

const CaretDown = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
  >
    <g clipPath="url(#clip0_1_2045)">
      <path
        d="M16.25 7.5L10 13.75L3.75 7.5"
        stroke="white"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_1_2045">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export const Navbar = () => {
  return (
    <nav aria-label="Primary" className="relative z-30 w-full">
      {/* Mobile / tablet */}
      <div className="flex w-full items-center px-4 ipad:px-0 justify-between py-4 desktop-sm:hidden ipad:max-w-160 mx-auto">
        <Logo />

        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center touch-manipulation transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-80"
        >
          <img
            src={asset("nav-menu-icon.svg")}
            alt=""
            width={24}
            height={24}
            className="size-6"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden w-full max-w-360 grid-cols-[1fr_auto_1fr] items-center px-20 pt-4.75 desktop-sm:grid">
        <Logo />

        <ul className="flex items-center gap-9">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                tabIndex={0}
                aria-label={link.label}
                aria-haspopup={link.hasDropdown ? "true" : undefined}
                className={LINK_CLASS}
              >
                {link.label}
                {link.hasDropdown ? <CaretDown /> : null}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center justify-self-end gap-4">
          <a
            href="#login"
            tabIndex={0}
            aria-label="Log in"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.1)] px-[18px] py-3 font-outfit text-[16px] font-medium leading-[1.5] tracking-[-0.32px] text-[#b0b0b0] touch-manipulation whitespace-nowrap transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90"
          >
            Log in
          </a>

          <a
            href="#signup"
            tabIndex={0}
            aria-label="Sign up"
            className="relative inline-flex h-10 shrink-0 items-center justify-center overflow-clip rounded-[12px] border-[0.6px] border-solid border-white px-6 py-3 font-outfit text-[16px] font-medium leading-[1.5] tracking-[-0.32px] text-white touch-manipulation whitespace-nowrap transition-opacity duration-200 ease focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [-webkit-tap-highlight-color:transparent] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[12px] bg-[linear-gradient(97deg,#000_-31.45%,#323232_54.98%,#282828_100%)]"
            />
            <span className="relative z-1">Sign up</span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_4px_4px_0_rgba(255,255,255,0.25)]"
            />
          </a>
        </div>
      </div>
    </nav>
  );
};
