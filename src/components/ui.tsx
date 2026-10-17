import React from "react";
import { TOKENS, glass } from "../lib/tokens";
import SiteRings from "./SiteRings";
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?:"primary"|"ghost"|"outline"; size?:"sm"|"md"|"lg"}>=({variant="primary", size="md", style, children, ...p})=>{
  const base:React.CSSProperties = { borderRadius:999, fontWeight:700, letterSpacing:"-0.01em", cursor:"pointer", border:"1px solid transparent", transition:"all .2s cubic-bezier(0.16,1,0.3,1)", fontFamily:"Inter,sans-serif" };
  const sizes = { sm:{padding:"8px 14px", fontSize:13}, md:{padding:"11px 18px", fontSize:14}, lg:{padding:"13px 22px", fontSize:15} }[size];
  const vars:Record<string,React.CSSProperties> = {
    primary:{ background:"linear-gradient(180deg,#6B8CFF 0%,#4A6FE8 100%)", color:"#fff", boxShadow:"0 8px 24px rgba(91,127,255,0.35), 0 1px 0 rgba(255,255,255,0.2) inset", borderColor:"rgba(255,255,255,0.18)"},
    ghost:{ background:"rgba(255,255,255,0.08)", color:"#fff", borderColor:"rgba(255,255,255,0.10)", backdropFilter:"blur(12px)"},
    outline:{ background:"transparent", color:"#fff", borderColor:"rgba(255,255,255,0.18)"},
  };
  return <button {...p} style={{...base, ...sizes, ...vars[variant], ...style}}>{children}</button>;
};
export const GlassCard: React.FC<{style?:React.CSSProperties; children:React.ReactNode; hover?:boolean; delay?: number}>=({style, children, hover, delay})=>(
  <div className={delay!=null ? "soft-enter" : undefined} style={{...glass(), borderRadius:TOKENS.radius, padding:18, transition:"transform .22s cubic-bezier(0.16,1,0.3,1), border-color .22s", ...(hover?{cursor:"pointer"}:{}), ...(delay!=null?{animationDelay:`${delay}ms`}:{}), ...style} as any}
    onMouseEnter={e=>{ if(hover){ (e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.borderColor=TOKENS.borderStrong; }}}
    onMouseLeave={e=>{ if(hover) (e.currentTarget as HTMLDivElement).style.transform="translateY(0)"}}
  >{children}</div>
);
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & {label?:string; error?:string}>=({label, error, style, ...p})=>(
  <label style={{display:"flex", flexDirection:"column", gap:6, fontFamily:"Inter,sans-serif"}}>
    {label && <span style={{fontSize:12, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:TOKENS.muted2}}>{label}</span>}
    <input {...p} style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${error?TOKENS.danger:TOKENS.border}`, borderRadius:12, padding:"11px 13px", color:"#fff", outline:"none", fontSize:14, fontFamily:"Inter,sans-serif", ...style }} />
    {error && <span style={{color:TOKENS.danger, fontSize:12}}>{error}</span>}
  </label>
);
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & {label?:string}>=({label, style, ...p})=>(
  <label style={{display:"flex", flexDirection:"column", gap:6, fontFamily:"Inter,sans-serif"}}>
    {label && <span style={{fontSize:12, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:TOKENS.muted2}}>{label}</span>}
    <textarea {...p} style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${TOKENS.border}`, borderRadius:12, padding:"11px 13px", color:"#fff", outline:"none", fontSize:14, minHeight:90, fontFamily:"Inter,sans-serif", ...style }} />
  </label>
);
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & {label?:string; options:string[]}>=({label, options, style, ...p})=>(
  <label style={{display:"flex", flexDirection:"column", gap:6, fontFamily:"Inter,sans-serif"}}>
    {label && <span style={{fontSize:12, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:TOKENS.muted2}}>{label}</span>}
    <select {...p} style={{ background:"rgba(18,22,38,0.9)", border:`1px solid ${TOKENS.border}`, borderRadius:12, padding:"11px 13px", color:"#fff", outline:"none", fontSize:14, fontFamily:"Inter,sans-serif", ...style }}>
      <option value="">Select</option>{options.map(o=> <option key={o} value={o} style={{color:"#000"}}>{o}</option>)}
    </select>
  </label>
);
export const Badge: React.FC<{children:React.ReactNode; tone?:"neutral"|"success"|"warning"|"danger"}>=({children, tone="neutral"})=>{
  const map={ neutral:{bg:"rgba(255,255,255,0.08)",c:"#fff"}, success:{bg:"rgba(52,211,153,0.18)",c:"#34D399"}, warning:{bg:"rgba(251,191,36,0.18)",c:"#FBBF24"}, danger:{bg:"rgba(248,113,113,0.18)",c:"#F87171"}}[tone];
  return <span style={{background:map.bg, color:map.c, border:`1px solid ${map.c}33`, padding:"4px 9px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", fontFamily:"Inter,sans-serif"}}>{children}</span>;
};
export const PageShell: React.FC<{children:React.ReactNode; title?:string; subtitle?:string; actions?:React.ReactNode}>=({children, title, subtitle, actions})=>(
  <div style={{minHeight:"100vh", background:TOKENS.bg, color:"#fff", fontFamily:"Inter,sans-serif", position:"relative", overflow:"hidden"}}>
    <SiteRings />
    <div style={{position:"relative", zIndex:1, maxWidth:1120, margin:"0 auto", padding:"28px 20px 40px"}}>
      {(title||actions) && <div className="reveal" style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16, marginBottom:18, flexWrap:"wrap"}}>
        <div>
          {title && <h1 style={{fontSize:28, fontWeight:800, letterSpacing:"-0.03em", lineHeight:1}}>{title}</h1>}
          {subtitle && <p style={{color:TOKENS.muted2, fontSize:14, marginTop:6}}>{subtitle}</p>}
        </div>
        {actions && <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>{actions}</div>}
      </div>}
      <div className="reveal-2">{children}</div>
    </div>
  </div>
);
