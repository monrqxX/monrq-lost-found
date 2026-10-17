// Premium smooth easings — GPU-friendly, 60fps+ optimized
// cubic-bezier(0.16, 1, 0.3, 1) = Apple/linear smooth deceleration
export const easeOutExpo = (x: number) => 1 - Math.pow(1 - x, 3)
export const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4)
export const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5)
export const easeInOutCubic = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
export const easeInOutQuart = (x: number) => x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2
export const easeInOutExpo = (x: number) => x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2

// smooth lerp for rAF smoothing (prevents micro-jitter)
export const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b
export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))
export const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) => outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin)

// spring approximation for buttery motion (no external lib needed)
export const spring = (t: number, damping = 0.78, stiffness = 0.12) => {
  // under-damped spring: 1 - cos * exp
  return 1 - Math.cos(t * Math.PI * 2 * Math.sqrt(stiffness) * 8) * Math.exp(-damping * t * 6)
}
