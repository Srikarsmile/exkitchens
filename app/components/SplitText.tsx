"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef, useMemo } from "react";

interface SplitTextProps {
  /** The text to split and animate */
  text: string;
  /** Wrapper element tag – defaults to span */
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p";
  className?: string;
  /**
   * Stagger delay per character in seconds.
   * Mirrors StringTune's `transition-delay: calc((--char-start / 5) * 0.3s)`.
   * Default: 0.03s
   */
  charDelay?: number;
  /** Duration of each character's transition. Default: 0.7s */
  duration?: number;
  /** Y offset to start from (px). Default: 80 */
  yOffset?: number;
  /** Bottom margin before triggering (px, negative = starts before entering). Default: -80 */
  bottomMargin?: number;
  /** Only play once (like .inview with no re-trigger). Default: true */
  once?: boolean;
  /** Use larger clipping padding for italic/serif fonts (e.g. Playfair Display). Default: false */
  italic?: boolean;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {},
};

export default function SplitText({
  text,
  as: Tag = "span",
  className = "",
  charDelay = 0.04,
  duration = 0.9,
  yOffset = 40,
  bottomMargin = -80,
  once = true,
  italic = false,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref as React.RefObject<Element>, {
    once,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    margin: `0px 0px ${bottomMargin}px 0px` as any,
  });

  // Split text preserving spaces as non-breaking entities
  const chars = useMemo(() => text.split(""), [text]);

  const charVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: "blur(4px)" },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration,
        delay: i * charDelay,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
  };

  const padV = "0.15em";
  const padH = italic ? "0.15em" : "0.05em";
  const spaceWidth = italic ? "0.35em" : "0.3em";

  const MotionTag = motion[Tag as keyof typeof motion] as typeof motion.span;

  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={`inline-flex flex-wrap ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      aria-label={text}
    >
      {chars.map((char, i) =>
        char === " " ? (
          <span key={i} aria-hidden="true" style={{ display: "inline-block", width: spaceWidth }} />
        ) : (
          // Outer span clips the y-entrance only for this character
          <span
            key={i}
            aria-hidden="true"
            style={{
              display: "inline-block",
              overflow: italic ? "visible" : "hidden",
              padding: `${padV} ${padH}`,
              margin: `0 -${padH}`,
            }}
          >
            <motion.span
              custom={i}
              variants={charVariants}
              style={{
                display: "inline-block",
                willChange: "transform, opacity, filter",
                ...(italic ? { padding: "0 0.2em", margin: "0 -0.2em" } : {}),
              }}
            >
              {char}
            </motion.span>
          </span>
        )
      )}
    </MotionTag>
  );
}
