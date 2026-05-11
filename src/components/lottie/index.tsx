"use client";

/**
 * Named Lottie components for vibechckd UX motion.
 * Wraps the 15 selected animations from /public/lottie/audit/.
 *
 * All animations use Geist font + #171717 ink + single-green-accent
 * design language. Components are sized restrained by default (matches
 * your minimal aesthetic — favor 24-32px for inline, 48-64px for hero).
 */

import { LottieIcon, type LottieIconProps } from "./LottieIcon";

export { LottieIcon } from "./LottieIcon";
export type { LottieIconProps } from "./LottieIcon";

// ── Toggle / state-driven ────────────────────────────────────────────────
export function HeartBurst(props: { active: boolean; size?: number; className?: string }) {
  return (
    <LottieIcon
      slug="heart-burst"
      playMode="controlled"
      active={props.active}
      size={props.size ?? 40}
      className={props.className}
    />
  );
}

export function HamburgerMorph(props: { open: boolean; size?: number; className?: string }) {
  return (
    <LottieIcon
      slug="hamburger-morph"
      playMode="controlled"
      active={props.open}
      size={props.size ?? 24}
      className={props.className}
    />
  );
}

// ── One-shot on mount ───────────────────────────────────────────────────
export function VerifiedStamp(props: { size?: number; className?: string }) {
  return (
    <LottieIcon
      slug="verified-stamp"
      playMode="auto"
      size={props.size ?? 48}
      className={props.className}
    />
  );
}

export function CheckSuccess(props: { size?: number; replay?: number | string; className?: string }) {
  return (
    <LottieIcon
      slug="check-success"
      playMode={props.replay !== undefined ? "trigger" : "auto"}
      replay={props.replay}
      size={props.size ?? 64}
      className={props.className}
    />
  );
}

export function CheckInline(props: { size?: number; replay?: number | string; className?: string }) {
  return (
    <LottieIcon
      slug="check-inline"
      playMode={props.replay !== undefined ? "trigger" : "auto"}
      replay={props.replay}
      size={props.size ?? 28}
      className={props.className}
    />
  );
}

export function ErrorX(props: { size?: number; replay?: number | string; className?: string }) {
  return (
    <LottieIcon
      slug="error-x"
      playMode={props.replay !== undefined ? "trigger" : "auto"}
      replay={props.replay}
      size={props.size ?? 64}
      className={props.className}
    />
  );
}

export function StepIndicator(props: { size?: number; className?: string }) {
  // Renders 240×40 internally; size scales the height
  const w = props.size ? props.size * 6 : 240;
  return (
    <LottieIcon
      slug="step-indicator"
      playMode="auto"
      size={w}
      style={{ width: w, height: (w / 240) * 40 }}
      className={props.className}
    />
  );
}

export function CardCascade(props: { size?: number; className?: string }) {
  return (
    <LottieIcon
      slug="card-cascade"
      playMode="auto"
      size={props.size ?? 320}
      className={props.className}
    />
  );
}

export function PageWipe(props: { size?: number; className?: string }) {
  return (
    <LottieIcon
      slug="page-wipe"
      playMode="auto"
      size={props.size ?? 320}
      className={props.className}
    />
  );
}

// ── Continuous loops ────────────────────────────────────────────────────
export function WarningPulse(props: { size?: number; className?: string }) {
  return (
    <LottieIcon
      slug="warning-pulse"
      playMode="loop"
      size={props.size ?? 48}
      className={props.className}
    />
  );
}

export function TypingDots(props: { size?: number; className?: string }) {
  const w = props.size ?? 64;
  return (
    <LottieIcon
      slug="typing-dots"
      playMode="loop"
      size={w}
      style={{ width: w, height: (w / 64) * 24 }}
      className={props.className}
    />
  );
}

export function SkeletonShimmer(props: {
  width?: number | string;
  height?: number;
  className?: string;
}) {
  return (
    <LottieIcon
      slug="skeleton-shimmer"
      playMode="loop"
      size={typeof props.width === "number" ? props.width : 200}
      style={{
        width: props.width ?? "100%",
        height: props.height ?? 60,
        display: "block",
      }}
      className={props.className}
    />
  );
}

export function FilterFunnel(props: { size?: number; className?: string }) {
  return (
    <LottieIcon
      slug="filter-funnel"
      playMode="hover"
      size={props.size ?? 24}
      className={props.className}
    />
  );
}

export function CardLift(props: { size?: number; className?: string }) {
  return (
    <LottieIcon
      slug="card-lift"
      playMode="hover"
      size={props.size ?? 200}
      className={props.className}
    />
  );
}

// ── State-driven (saving spinner → check) ───────────────────────────────
/**
 * Saving indicator. Plays the spinner→check animation whenever `saving`
 * transitions from true to false (i.e., on save complete).
 */
export function SaveState(props: { saving: boolean; size?: number; className?: string }) {
  // Use `saving` as a stringified replay token so the animation restarts
  // each save cycle. When `saving=true` we show nothing (or could show a spinner).
  return (
    <LottieIcon
      slug="save-state"
      playMode="trigger"
      replay={String(props.saving)}
      size={props.size ?? 32}
      className={props.className}
    />
  );
}
