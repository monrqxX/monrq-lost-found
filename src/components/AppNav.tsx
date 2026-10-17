import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { TOKENS } from "../lib/tokens";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui";
const NAV = [
  {to:"/dashboard", label:"Home"},
  {to:"/search", label:"Search"},
  {to:"/my-items", label:"My Items"},
  {to:"/matches", label:"Matches"},
  {to:"/messages", label:"Messages"},
  {to:"/notifications", label:"Notifications"},
];
export default function AppNav(){
  const {user, logout} = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  return (
    <div style={{position:"sticky", top:0, zIndex:20, backdropFilter:"blur(18px) saturate(1.2)", WebkitBackdropFilter:"blur(18px) saturate(1.2)", background:"rgba(4,6,10,0.72)", borderBottom:`1px solid ${TOKENS.border}`, fontFamily:"Inter,sans-serif"}}>
      <div style={{maxWidth:1120, margin:"0 auto", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, flexWrap:"wrap"}}>
        <Link to={user?"/dashboard":"/"} style={{textDecoration:"none", display:"flex", alignItems:"center", gap:10}}>
          <span style={{filter:"brightness(0) invert(1)", display:"flex"}}><Logo/></span>
        </Link>
        <nav style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
          {NAV.map(n=>{
            const active = loc.pathname===n.to || loc.pathname.startsWith(n.to+"/");
            return <Link key={n.to} to={n.to} style={{textDecoration:"none", padding:"8px 12px", borderRadius:999, fontSize:13, fontWeight:700, letterSpacing:"-0.01em", color: active?"#fff":TOKENS.muted2, background: active?"rgba(255,255,255,0.10)":"transparent", border:`1px solid ${active?TOKENS.borderStrong:"transparent"}`}}>{n.label}</Link>;
          })}
        </nav>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          {!user ? <>
            <Link to="/login" style={{textDecoration:"none"}}><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/register" style={{textDecoration:"none"}}><Button size="sm">Sign up</Button></Link>
          </> : <>
            <Link to="/profile" style={{textDecoration:"none", color:TOKENS.muted2, fontSize:13, fontWeight:600}}>{user.displayName}</Link>
            <Link to="/admin" style={{textDecoration:"none", color:TOKENS.muted, fontSize:12, fontWeight:700, border:`1px solid ${TOKENS.border}`, padding:"6px 10px", borderRadius:999}}>Admin</Link>
            <Button variant="ghost" size="sm" onClick={async()=>{await logout(); nav("/");}}>Sign out</Button>
          </>}
        </div>
      </div>
    </div>
  );
}
