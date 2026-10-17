import { Link } from "react-router-dom";
import { PageShell, GlassCard, Badge, Button } from "../components/ui";
import AppNav from "../components/AppNav";
import { useApiData } from "../hooks/useApiData";
import { useAuth } from "../hooks/useAuth";
import { TOKENS } from "../lib/tokens";
type DashboardData = { items: any[]; matches: any[]; incomingClaims: number; pendingClaims: number };
export default function Dashboard(){
  const { user } = useAuth();
  const { data, loading, error } = useApiData<DashboardData>("/dashboard");
  const items = data?.items || []; const matches = data?.matches || [];
  const lost = items.filter(i=>i.type==="LOST").length; const found = items.filter(i=>i.type==="FOUND").length;
  return <><AppNav/><PageShell title={`Welcome, ${user?.displayName||"there"}`} subtitle="Here's what's happening with your items" actions={<><Link to="/lost/new" style={{textDecoration:"none"}}><Button>I lost something</Button></Link><Link to="/found/new" style={{textDecoration:"none"}}><Button variant="ghost">I found something</Button></Link></>}>
    {error && <div role="alert" style={{color:TOKENS.danger,marginBottom:12}}>{error}</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>{[[lost,"Lost"],[found,"Found"],[matches.length,"Matches"],[data?.pendingClaims||0,"Pending claims"]].map(([v,l])=><GlassCard key={String(l)} style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:800}}>{loading?"—":String(v)}</div><div style={{color:TOKENS.muted2,fontSize:12,fontWeight:700,textTransform:"uppercase"}}>{String(l)}</div></GlassCard>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1.2fr .8fr",gap:14,marginTop:14}}>
      <GlassCard><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:14,fontWeight:800}}>Recent items</h3><Link to="/my-items" style={{color:TOKENS.muted,fontSize:12,fontWeight:700}}>View all</Link></div><div style={{display:"grid",gap:10,marginTop:12}}>{items.slice(0,3).map(it=><Link key={it.id} to={`/items/${it.id}`} style={{textDecoration:"none",display:"flex",gap:12,alignItems:"center",padding:10,borderRadius:12,background:"rgba(255,255,255,0.04)",border:`1px solid ${TOKENS.border}`}}><div style={{width:48,height:48,borderRadius:10,background:"linear-gradient(135deg,#4B7EDB,#1E2F8A)",display:"grid",placeItems:"center",color:"#fff",fontWeight:800}}>{it.category[0].toUpperCase()}</div><div style={{flex:1}}><div style={{color:"#fff",fontWeight:700,fontSize:13}}>{it.title}</div><div style={{color:TOKENS.muted2,fontSize:12}}>{it.location.city} · {new Date(it.dateOccurred).toLocaleDateString()}</div></div><Badge>{it.status}</Badge></Link>)}{!loading&&items.length===0&&<div style={{color:TOKENS.muted2,fontSize:13}}>No items yet. Report a lost or found item to get started.</div>}</div></GlassCard>
      <GlassCard><h3 style={{fontSize:14,fontWeight:800}}>Potential matches</h3><div style={{display:"grid",gap:10,marginTop:12}}>{matches.slice(0,3).map(m=><Link key={m.id} to={`/matches/${m.id}`} style={{textDecoration:"none",padding:10,borderRadius:12,background:"rgba(255,255,255,0.04)",border:`1px solid ${TOKENS.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:"#fff",fontWeight:700,fontSize:13}}>{m.score}% match</div><div style={{color:TOKENS.muted2,fontSize:12}}>{m.lostItemId} ↔ {m.foundItemId}</div></div><Badge tone="warning">{m.status}</Badge></Link>)}{!loading&&matches.length===0&&<div style={{color:TOKENS.muted2,fontSize:13}}>No matches yet — we'll keep checking as new items are reported.</div>}</div></GlassCard>
    </div>
  </PageShell></>;
}
