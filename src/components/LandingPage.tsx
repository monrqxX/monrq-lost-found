import { useEffect, useRef } from 'react'
import BackgroundRings from './BackgroundRings'
import Logo from './Logo'
import { easeOutExpo, easeOutQuart, easeInOutCubic, lerp, clamp } from '../animation/easing'
import { TIMELINE } from '../animation/timeline'

export default function LandingPage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const ringsRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const streakRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const orbsRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const parallaxTarget = useRef({ x: 0, y: 0 })
  const parallaxCurrent = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const rings = ringsRef.current!
    const center = centerRef.current!
    const brand = brandRef.current!
    const tagline = taglineRef.current!
    const streak = streakRef.current!
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isPhone = window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && window.innerWidth <= 768)
    const lowPower = typeof navigator !== 'undefined' && ((navigator as unknown as { hardwareConcurrency?: number }).hardwareConcurrency ?? 8) <= 4
    // phone = auto lite mode: kill parallax/drift/breathe/streak for 60fps
    const shouldReduce = isReduced || lowPower || isPhone

    const buildChars = (text: string) =>
      text.split('').map((ch) => {
        const s = document.createElement('span')
        s.textContent = ch === ' ' ? '\u00A0' : ch
        s.className = 'char'
        s.style.display = 'inline-block'
        s.style.willChange = 'transform, opacity'
        s.style.backfaceVisibility = 'hidden'
        s.style.transform = 'translateZ(0)'
        return s
      })
    const lostSpans = buildChars('Lost it?')
    const foundSpans = buildChars('Found it.')

    let active: 'lost' | 'found' | 'none' = 'none'
    let cachedChars: HTMLElement[] = []
    const setChars = (which: 'lost' | 'found') => {
      if (active === which) return
      active = which
      center.innerHTML = ''
      const list = which === 'lost' ? lostSpans : foundSpans
      const frag = document.createDocumentFragment()
      cachedChars = []
      list.forEach((s) => {
        const c = s.cloneNode(true) as HTMLElement
        c.style.opacity = '0'
        c.style.transform = 'translate3d(0,12px,0)'
        frag.appendChild(c)
        cachedChars.push(c)
      })
      center.appendChild(frag)
      if (which === 'lost') {
        center.style.color = '#FFFFFF'
        center.style.fontWeight = '800'
        center.style.letterSpacing = '-0.035em'
        center.style.fontSize = '66px'
      } else {
        center.style.color = '#A5B8FF'
        center.style.fontWeight = '700'
        center.style.letterSpacing = '-0.028em'
        center.style.fontSize = '68px'
      }
    }

    const onPointer = (e: PointerEvent) => {
      if (shouldReduce) return
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      parallaxTarget.current.x = x * 5
      parallaxTarget.current.y = y * 3.5
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    let hidden = false
    const onVis = () => { hidden = document.hidden }
    document.addEventListener('visibilitychange', onVis)
    let isVisible = true
    let observer: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== 'undefined' && stageRef.current) {
      observer = new IntersectionObserver((entries) => { isVisible = entries[0]?.isIntersecting ?? true }, { threshold: 0 })
      observer.observe(stageRef.current)
    }

    const loop = (now: number) => {
      if (hidden || !isVisible) { rafRef.current = requestAnimationFrame(loop); return }
      if (!startRef.current) startRef.current = now
      const t = (now - startRef.current) / 1000
      const pRaw = t % TIMELINE.LOOP
      parallaxCurrent.current.x = lerp(parallaxCurrent.current.x, parallaxTarget.current.x, shouldReduce ? 0.04 : 0.06)
      parallaxCurrent.current.y = lerp(parallaxCurrent.current.y, parallaxTarget.current.y, shouldReduce ? 0.04 : 0.06)
      const px = parallaxCurrent.current.x
      const py = parallaxCurrent.current.y
      const breathe = shouldReduce ? 0 : Math.sin((t / TIMELINE.breathePeriod) * Math.PI * 2) * 0.0025
      const driftX = shouldReduce ? 0 : Math.sin(t * 0.08) * 0.6
      const driftY = shouldReduce ? 0 : Math.cos(t * 0.06) * 0.45
      const rin = clamp(pRaw / TIMELINE.ringsIn.dur)
      const rEase = easeOutQuart(rin)
      const baseScale = 0.97 + 0.03 * rEase + breathe
      let boost = 0
      let rot = -0.9
      if (!shouldReduce && pRaw > 2.88 && pRaw < 3.58) {
        const b = easeInOutCubic(clamp((pRaw - 2.88) / 0.70))
        boost = b * 0.006
        rot = -0.9 + b * 0.2
      }
      rings.style.opacity = String(rEase)
      rings.style.transform = `translate3d(calc(-50% + ${px * 0.18 + driftX}px), calc(-50% + ${py * 0.14 + driftY}px), 0) rotate(${rot}deg) scale(${baseScale + boost})`

      // CENTER TEXT - subtler, slower, smaller motion
      if (pRaw < 0.68) {
        center.style.opacity = '0'
        center.style.transform = `translate3d(-50%, calc(-50% + ${py * 0.02}px), 0) rotate(-0.8deg)`
      } else if (pRaw < TIMELINE.lostHoldEnd) {
        setChars('lost')
        const ip = clamp((pRaw - 0.68) / TIMELINE.lostIn.dur)
        const e = easeOutExpo(ip)
        center.style.opacity = String(e)
        const floatY = shouldReduce ? 0 : Math.sin(t * 0.40) * 0.35
        center.style.transform = `translate3d(-50%, calc(-50% + ${(1 - e) * 6 + floatY}px), 0) rotate(-0.8deg)`
        cachedChars.forEach((ch, i) => {
          const d = i * 0.045
          const lp = clamp((ip - d) / (1 - d * 0.4))
          const ce = easeOutQuart(lp)
          ch.style.opacity = String(ce)
          ch.style.transform = `translate3d(0, ${(1 - ce) * 7}px, 0)`
        })
      } else if (pRaw < TIMELINE.foundIn.start) {
        const ep = clamp((pRaw - TIMELINE.lostHoldEnd) / TIMELINE.lostOutDur)
        const e = easeInOutCubic(ep)
        center.style.opacity = String(1 - e)
        center.style.transform = `translate3d(-50%, calc(-50% + ${-e * 2}px), 0) rotate(-0.8deg) scale(${1 - e * 0.008})`
        if (!shouldReduce && pRaw > TIMELINE.streakAt && pRaw < TIMELINE.streakAt + 0.42) {
          const sp = clamp((pRaw - TIMELINE.streakAt) / 0.42)
          const se = easeInOutCubic(sp)
          const x = -75 + se * 150
          streak.style.opacity = String(0.55 * Math.sin(sp * Math.PI))
          streak.style.transform = `translate3d(calc(-50% + ${x}px), -46%, 0) rotate(-24deg) scaleX(${2.2 - se * 0.15}) scaleY(0.9)`
        } else streak.style.opacity = '0'
      } else {
        setChars('found')
        const ip = clamp((pRaw - TIMELINE.foundIn.start) / TIMELINE.foundIn.dur)
        const e = easeOutQuart(ip)
        center.style.opacity = String(e)
        const floatY = shouldReduce ? 0 : Math.sin(t * 0.36 + 0.6) * 0.30
        center.style.transform = `translate3d(-50%, calc(-50% + ${(1 - e) * 6 + floatY}px), 0) rotate(-0.8deg)`
        cachedChars.forEach((ch, i) => {
          const d = i * 0.04
          const lp = clamp((ip - d) / (1 - d * 0.35))
          const ce = easeOutExpo(lp)
          ch.style.opacity = String(ce)
          ch.style.transform = `translate3d(0, ${(1 - ce) * 6}px, 0)`
        })
        streak.style.opacity = '0'
      }

      // BRAND/TAGLINE - subtler, slower
      if (pRaw > TIMELINE.brandIn.start) {
        const ip = clamp((pRaw - TIMELINE.brandIn.start) / TIMELINE.brandIn.dur)
        const e = easeOutExpo(ip)
        brand.style.opacity = String(e)
        brand.style.transform = `translate3d(-50%, ${(1 - e) * 4}px, 0)`
      } else {
        brand.style.opacity = '0'
        brand.style.transform = `translate3d(-50%, 4px, 0)`
      }
      if (pRaw > TIMELINE.taglineIn.start) {
        const ip = clamp((pRaw - TIMELINE.taglineIn.start) / TIMELINE.taglineIn.dur)
        const e = easeOutExpo(ip)
        tagline.style.opacity = String(e)
        tagline.style.transform = `translate3d(-50%, ${(1 - e) * 4}px, 0)`
      } else {
        tagline.style.opacity = '0'
        tagline.style.transform = `translate3d(-50%, 4px, 0)`
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVis)
      observer?.disconnect()
    }
  }, [])

  return (
    <div
      ref={stageRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#04060A',
        overflow: 'hidden',
        contain: 'layout paint',
      }}
    >
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '92vw',
          height: '92vh',
          background:
            'radial-gradient(ellipse 60% 50% at 36% 48%, rgba(72,105,220,0.32) 0%, rgba(42,66,150,0.16) 32%, rgba(12,18,55,0) 70%), radial-gradient(ellipse 44% 40% at 68% 62%, rgba(120,90,255,0.10) 0%, transparent 68%)',
          opacity: 0.48,
          pointerEvents: 'none',
          transform: 'translate(-50%,-50%)',
        }}
      />
      <div
        ref={ringsRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '140vw',
          height: '140vh',
          transform: 'translate(-50%,-50%) rotate(-1.8deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          willChange: 'transform, opacity',
        }}
      >
        <BackgroundRings />
      </div>
      <div ref={orbsRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const s = 1.2 + (i % 3) * 0.7
          const left = (i * 53 + 11) % 100
          const top = (i * 71 + 17) % 100
          return (
            <span key={i} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, width: s, height: s, borderRadius: 999, background: i % 3 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(165,184,255,0.8)', opacity: 0.45 + (i % 3) * 0.08 }} />
          )
        })}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 78% 72% at 50% 50%, transparent 58%, rgba(0,0,0,0.32) 86%, rgba(0,0,0,0.62) 100%)', pointerEvents: 'none' }} />
      <div ref={streakRef} style={{ position: 'absolute', left: '50%', top: '50%', width: 520, height: 110, background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.92) 0%, rgba(220,230,255,0.4) 30%, rgba(165,184,255,0.14) 52%, rgba(255,255,255,0) 72%)', transform: 'translate(-50%,-50%) rotate(-24deg) scaleX(2.2) scaleY(0.9)', opacity: 0, pointerEvents: 'none', willChange: 'transform, opacity' }} />
      <div ref={brandRef} style={{ position: 'absolute', top: 34, left: '50%', transform: 'translate3d(-50%, 6px, 0)', opacity: 0, willChange: 'transform, opacity' }}><Logo /></div>
      <div ref={centerRef} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate3d(-50%,-50%,0) rotate(-1.6deg)', fontWeight: 800, lineHeight: 1, textAlign: 'center', whiteSpace: 'nowrap', willChange: 'transform, opacity', fontFamily: "'Inter', sans-serif", textShadow: '0 1px 0 rgba(0,0,0,0.35)' }} />
      <div ref={taglineRef} style={{ position: 'absolute', bottom: 38, left: '50%', transform: 'translate3d(-50%, 6px, 0)', color: '#9AB0FF', fontWeight: 500, letterSpacing: '0.02em', fontSize: 14.5, opacity: 0, whiteSpace: 'nowrap', willChange: 'transform, opacity' }}>Lost &amp; Found, reunited.</div>
      <div style={{ position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, zIndex: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/lost/new" style={{ textDecoration: 'none', padding: '11px 18px', borderRadius: 999, background: 'linear-gradient(180deg,#6B8CFF 0%,#4A6FE8 100%)', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'Inter,sans-serif', boxShadow: '0 8px 24px rgba(91,127,255,0.35)', border: '1px solid rgba(255,255,255,0.18)' }}>Report Lost</a>
        <a href="/found/new" style={{ textDecoration: 'none', padding: '11px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'Inter,sans-serif', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(10px)' }}>Report Found</a>
        <a href="/search" style={{ textDecoration: 'none', padding: '11px 18px', borderRadius: 999, background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'Inter,sans-serif', border: '1px solid rgba(255,255,255,0.18)' }}>Search</a>
        <a href="/login" style={{ textDecoration: 'none', padding: '11px 18px', borderRadius: 999, background: 'transparent', color: '#9AB0FF', fontWeight: 700, fontSize: 14, fontFamily: 'Inter,sans-serif', border: '1px solid transparent' }}>Log in</a>
      </div>
      <style>{`@media(max-width:640px){ div[style*="font-size: 66px"], div[style*="font-size: 68px"]{ font-size: 42px !important; } } @media (prefers-reduced-motion: reduce){ *{ animation:none !important; } }`}</style>
    </div>
  )
}
