import logoSrc from '../assets/logo.png'
// AUTHORITATIVE ASSET - do not redraw. Invert to white for dark background. Preserve aspect.
export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={logoSrc}
        alt="MONRQ"
        onError={(e) => {
          // fallback to text if png path is wrong, keep geometry
          const t = e.currentTarget
          t.style.display = 'none'
          const fb = document.getElementById('logo-fallback')
          if (fb) fb.style.display = 'block'
        }}
        style={{
          height: 32,
          width: 'auto',
          // your supplied logo is black on transparent, invert to white
          filter: 'brightness(0) invert(1)',
          opacity: 0.98,
          display: 'block',
        }}
      />
      <span id="logo-fallback" style={{ display: 'none', color: '#fff', fontWeight: 600, letterSpacing: '0.18em', fontSize: 22 }}>
        MONRQ
      </span>
    </div>
  )
}