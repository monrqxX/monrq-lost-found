type RingProps = { parallaxX?: number; parallaxY?: number; reveal?: number; variant?: 'hero' | 'subtle' }

export default function BackgroundRings({ parallaxX = 0, parallaxY = 0, variant = 'hero' }: RingProps) {
  const isSubtle = variant === 'subtle'
  // hero: 7 rings for landing. subtle: 5 rings, lower opacity, less blur - for site-wide background
  const defs = isSubtle
    ? [
        { w: 520, h: 680, bw: 1.4, op: 0.10, r: 78, delay: 0 },
        { w: 640, h: 800, bw: 1.6, op: 0.13, r: 90, delay: 0.05 },
        { w: 760, h: 940, bw: 1.8, op: 0.16, r: 102, delay: 0.10 },
        { w: 880, h: 1080, bw: 2.0, op: 0.12, r: 116, delay: 0.15 },
        { w: 1020, h: 1240, bw: 2.2, op: 0.08, r: 132, delay: 0.20 },
      ]
    : [
        { w: 560, h: 720, bw: 2.0, op: 0.38, r: 82, delay: 0.04 },
        { w: 640, h: 800, bw: 2.2, op: 0.46, r: 88, delay: 0.10 },
        { w: 720, h: 880, bw: 2.6, op: 0.56, r: 96, delay: 0.16 },
        { w: 810, h: 970, bw: 3.0, op: 0.66, r: 104, delay: 0.22 },
        { w: 900, h: 1070, bw: 3.6, op: 0.74, r: 114, delay: 0.29 },
        { w: 1000, h: 1180, bw: 4.2, op: 0.78, r: 128, delay: 0.36 },
        { w: 1110, h: 1300, bw: 4.8, op: 0.68, r: 142, delay: 0.43 },
      ]
  return (
    <>
      {defs.map((d, i) => {
        const depth = 0.35 + (i / defs.length) * 0.65
        const tx = parallaxX * depth
        const ty = parallaxY * depth
        return (
          <div
            key={i}
            className="ring ring-anim"
            style={{
              width: d.w,
              height: d.h,
              borderWidth: d.bw,
              opacity: d.op,
              borderRadius: d.r,
              animationDelay: `${d.delay}s`,
              // @ts-ignore css vars for parallax
              ['--px' as any]: `${tx}px`,
              ['--py' as any]: `${ty}px`,
              transform: `translate3d(calc(-50% + ${tx}px), calc(-50% + ${ty}px), 0)`,
            } as any}
          />
        )
      })}
      <style>{`
        .ring{
          position:absolute;left:50%;top:50%;
          border-style:solid;border-color:transparent;
          background: linear-gradient(90deg,#4B7EDB 0%, #2E4FAF 45%, #1E2F8A 70%, #16206A 100%) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          contain: paint;
        }
        .ring-anim{
          opacity:0;
          animation: ringIn 1.05s cubic-bezier(0.16,1,0.30,1) forwards;
          transform-origin: center center;
        }
        @keyframes ringIn{
          0%{ opacity:0; transform: translate3d(calc(-50% + var(--px,0px)), calc(-50% + var(--py,0px) + 6px),0) scale(0.96); }
          100%{ opacity:1; transform: translate3d(calc(-50% + var(--px,0px)), calc(-50% + var(--py,0px)),0) scale(1); }
        }
        /* subtle 2D drift - very slow, GPU only - disabled on phones */
        .ring-drift{ animation: ringDrift 18s ease-in-out infinite alternate; }
        @keyframes ringDrift{
          0%{ transform: translate3d(calc(-50% + var(--px,0px)), calc(-50% + var(--py,0px)),0) scale(1); }
          100%{ transform: translate3d(calc(-50% + var(--px,0px) + 4px), calc(-50% + var(--py,0px) - 3px),0) scale(1.005); }
        }
        @media (prefers-reduced-motion: reduce){
          .ring-anim{ animation:none; opacity:1; }
          .ring-drift{ animation:none; }
        }
        /* PHONE OPTIMIZATION - fewer rings paint, no drift, faster in */
        @media (max-width: 768px){
          .ring:nth-child(n+5){ display:none !important; } /* 7 -> 4 rings on phone = 43% less paint */
          .ring{ will-change: auto !important; contain: paint; }
          .ring-anim{ animation-duration: 0.65s !important; }
          .ring-drift{ animation:none !important; }
        }
      `}</style>
    </>
  )
}