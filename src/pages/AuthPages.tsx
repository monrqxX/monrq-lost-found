import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, GlassCard } from "../components/ui";
import { TOKENS } from "../lib/tokens";
import Logo from "../components/Logo";
import SiteRings from "../components/SiteRings";
import { useAuth } from "../hooks/useAuth";

function AuthShell({title, subtitle, children}:{title:string; subtitle:string; children:React.ReactNode}){
  return (
    <div style={{minHeight:"100vh", background:TOKENS.bg, display:"grid", placeItems:"center", padding:20, fontFamily:"Inter,sans-serif", position:"relative", overflow:"hidden"}}>
      <SiteRings />
      <GlassCard style={{width:"100%", maxWidth:440, position:"relative", zIndex:1}} delay={80}>
        <Link to="/" style={{display:"flex", justifyContent:"center", marginBottom:16, textDecoration:"none", filter:"brightness(0) invert(1)"}}><Logo/></Link>
        <h1 style={{fontSize:22, fontWeight:800, letterSpacing:"-0.03em", color:"#fff", textAlign:"center"}}>{title}</h1>
        <p style={{color:TOKENS.muted2, fontSize:13, textAlign:"center", marginTop:6}}>{subtitle}</p>
        <div style={{marginTop:18, display:"flex", flexDirection:"column", gap:12}}>{children}</div>
      </GlassCard>
    </div>
  );
}
function GoogleButton({onClick, loading, label}:{onClick:()=>void; loading:boolean; label:string}){
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
        padding:"11px 18px", borderRadius:999, background:"#fff", color:"#1a1a1a",
        fontWeight:700, fontSize:14, fontFamily:"Inter,sans-serif",
        border:"1px solid rgba(0,0,0,0.08)", cursor: loading?"not-allowed":"pointer",
        opacity: loading?0.7:1, transition:"all .18s ease", boxShadow:"0 2px 10px rgba(0,0,0,0.12)"
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C34.7 32.1 30 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 2.9l6-6C34.5 5.1 29.6 3 24 3 11.3 3 1.1 13.5 1.1 24S11.3 45 24 45c11.4 0 20.9-8.1 20.9-21 0-1.4-.1-2.4-.3-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.8 13 24 13c3.1 0 5.9 1.1 8 2.9l6-6C34.5 5.1 29.6 3 24 3 15 3 7.3 8.2 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.5 0 10.4-2 14-5.2l-6.5-5.4C29.9 35.8 27.1 36 24 36c-5.1 0-9.4-3.5-11-8.1l-6.5 5C7.3 39.2 15 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.6 5.7-7.1 7.4l6.5 5.4C38.4 37.5 44 31.4 43.6 20.5z"/></svg>
      {label}
    </button>
  );
}

export function Login(){
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const [gLoading,setGLoading]=useState(false);
  const {login, loginWithGoogle}=useAuth(); const nav=useNavigate();
  const handleGoogle=async()=>{
    setErr(""); setGLoading(true);
    try{ await loginWithGoogle(); nav("/dashboard"); } catch(e:any){ setErr(e.message||"Google sign-in failed"); } finally{ setGLoading(false); }
  };
  return <AuthShell title="Welcome back" subtitle="Log in to MONRQ — Lost & Found, reunited.">
    <GoogleButton onClick={handleGoogle} loading={gLoading} label={gLoading?"Signing in...":"Continue with Google"} />
    <div style={{display:"flex", alignItems:"center", gap:12, margin:"2px 0"}}>
      <div style={{flex:1, height:1, background:TOKENS.border}}/>
      <span style={{color:TOKENS.muted2, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase"}}>or</span>
      <div style={{flex:1, height:1, background:TOKENS.border}}/>
    </div>
    <Input label="Email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
    <Input label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" />
    {err && <span style={{color:TOKENS.danger, fontSize:12}}>{err}</span>}
    <Button disabled={loading} onClick={async()=>{
      setErr(""); setLoading(true);
      try{ await login(email,pw); nav("/dashboard"); } catch(e:any){ setErr(e.message||"Login failed"); } finally{ setLoading(false); }
    }}>{loading?"Signing in...":"Log in"}</Button>
    <div style={{display:"flex", justifyContent:"space-between", fontSize:12}}>
      <Link to="/forgot-password" style={{color:TOKENS.muted}}>Forgot password?</Link>
      <Link to="/register" style={{color:TOKENS.muted}}>Create account</Link>
    </div>
    <div style={{textAlign:"center", color:TOKENS.muted2, fontSize:12}}>Sign in with your Supabase account.</div>
  </AuthShell>;
}
export function Register(){
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [pw2,setPw2]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const [gLoading,setGLoading]=useState(false);
  const {register, loginWithGoogle}=useAuth(); const nav=useNavigate();
  const handleGoogle=async()=>{
    setErr(""); setGLoading(true);
    try{ await loginWithGoogle(); nav("/dashboard"); } catch(e:any){ setErr(e.message||"Google sign-in failed"); } finally{ setGLoading(false); }
  };
  return <AuthShell title="Create account" subtitle="Join MONRQ and never lose what matters.">
    <GoogleButton onClick={handleGoogle} loading={gLoading} label={gLoading?"Signing in...":"Continue with Google"} />
    <div style={{display:"flex", alignItems:"center", gap:12, margin:"2px 0"}}>
      <div style={{flex:1, height:1, background:TOKENS.border}}/>
      <span style={{color:TOKENS.muted2, fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase"}}>or</span>
      <div style={{flex:1, height:1, background:TOKENS.border}}/>
    </div>
    <Input label="Full name" value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Doe" />
    <Input label="Email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
    <Input label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" />
    <Input label="Confirm password" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" error={pw && pw2 && pw!==pw2?"Passwords do not match":undefined} />
    {err && <span style={{color:TOKENS.danger, fontSize:12}}>{err}</span>}
    <Button disabled={loading|| (pw!==pw2)} onClick={async()=>{
      if(!name||!email||!pw) { setErr("All fields required"); return; }
      if(pw!==pw2){ setErr("Passwords do not match"); return; }
      setLoading(true); setErr("");
      try{ const signedIn=await register(name,email,pw); if(signedIn) nav("/dashboard"); else setErr("Account created. Check your email to confirm it, then sign in."); } catch(e:any){ setErr(e.message||"Registration failed"); } finally{ setLoading(false); }
    }}>{loading?"Creating...":"Create account"}</Button>
    <div style={{textAlign:"center", fontSize:12, color:TOKENS.muted2}}><Link to="/login" style={{color:TOKENS.muted}}>Already have an account? Log in</Link></div>
  </AuthShell>;
}
export function Forgot(){
  const [email,setEmail]=useState(""); const [msg,setMsg]=useState(""); const [err,setErr]=useState(""); const {reset}=useAuth();
  return <AuthShell title="Reset password" subtitle="We'll send you a reset link.">
    <Input label="Email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
    {msg && <span style={{color:TOKENS.success, fontSize:12}}>{msg}</span>}
    {err && <span role="alert" style={{color:TOKENS.danger,fontSize:12}}>{err}</span>}
    <Button onClick={async()=>{try{setErr("");await reset(email);setMsg("If an account exists, a reset email has been sent.");}catch(e:any){setErr(e.message||"Could not send reset email");}}}>Send reset link</Button>
    <Link to="/login" style={{color:TOKENS.muted, fontSize:12, textAlign:"center"}}>Back to login</Link>
  </AuthShell>;
}
export function ResetPassword(){
  const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const {updatePassword}=useAuth(); const nav=useNavigate();
  return <AuthShell title="Choose a new password" subtitle="Set a new password for your account.">
    <Input label="New password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
    <Input label="Confirm password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} />
    {err&&<span role="alert" style={{color:TOKENS.danger,fontSize:12}}>{err}</span>}
    <Button disabled={loading||!password||password!==confirm} onClick={async()=>{setErr("");setLoading(true);try{await updatePassword(password);nav("/dashboard");}catch(e:any){setErr(e.message||"Could not update password");}finally{setLoading(false);}}}>{loading?"Saving…":"Update password"}</Button>
  </AuthShell>;
}
export function VerifyEmail(){
  return <AuthShell title="Check your email" subtitle="We've sent a verification link. Verify and return to MONRQ.">
    <div style={{color:TOKENS.muted2, fontSize:13, textAlign:"center"}}>Click the link in your email to verify. Then continue to your dashboard.</div>
    <Link to="/dashboard" style={{textDecoration:"none"}}><Button style={{width:"100%"}}>Go to dashboard</Button></Link>
  </AuthShell>;
}
