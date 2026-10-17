import BackgroundRings from './BackgroundRings'

export default function SiteRings() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* subtle centered rings */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '46%',
          width: 900,
          height: 900,
          transform: 'translate(-50%,-50%)',
          opacity: 1,
        }}
      >
        <BackgroundRings variant="subtle" />
      </div>
      {/* soft vignette to keep contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 72% 62% at 50% 44%, transparent 56%, rgba(4,6,10,0.22) 78%, rgba(4,6,10,0.55) 100%)',
        }}
      />
      {/* very light top glow - hidden on phones (blur = jank) */}
      <div
        className="site-glow"
        style={{
          position: 'absolute',
          left: '50%',
          top: '42%',
          width: '92vw',
          height: '70vh',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(ellipse 58% 46% at 38% 42%, rgba(72,105,220,0.10) 0%, transparent 70%)',
          filter: 'blur(18px)',
          opacity: 0.9,
        }}
      />
      <style>{`@media (max-width: 768px){ .site-glow{ display:none !important; } }`}</style>
    </div>
  )
}
