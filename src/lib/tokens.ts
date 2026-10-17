// Design tokens extracted from LandingPage - single source of truth
export const TOKENS = {
  bg: "#04060A",
  surface: "rgba(255,255,255,0.06)",
  surfaceHover: "rgba(255,255,255,0.10)",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  muted: "#9AB0FF",
  muted2: "rgba(255,255,255,0.62)",
  accent: "#5B7FFF",
  accent2: "#A5B8FF",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  cardBg: "rgba(18,22,38,0.72)",
  cardBorder: "rgba(255,255,255,0.08)",
  shadow: "0 18px 60px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
  radius: 16,
  radiusSm: 12,
  radiusLg: 22,
  blur: "blur(18px)",
};
// helper to build glass styles
export const glass = (opacity=0.72) => ({
  background: `rgba(18,22,38,${opacity})`,
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: `1px solid ${TOKENS.cardBorder}`,
  boxShadow: TOKENS.shadow,
} as const);
