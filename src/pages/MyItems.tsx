import { useState } from "react"; import { Link } from "react-router-dom";
import AppNav from "../components/AppNav"; import { PageShell, GlassCard, Badge } from "../components/ui";
import { TOKENS } from "../lib/tokens"; import { useApiData } from "../hooks/useApiData";
export default function MyItems(){
  const {data,error}=useApiData<{items:any[]}>("/my/items"); const [tab,setTab]=useState<"ALL"|"LOST"|"FOUND"|"OPEN">("ALL");
  const mine=data?.items||[]; const filtered=mine.filter(i=>tab==="ALL"?true:tab==="OPEN"?i.status==="OPEN":i.type===tab);
  return <><AppNav/><PageShell title="My items" subtitle={`${mine.length} items reported`}><div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>{(["ALL","LOST","FOUND","OPEN"] as const).map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"8px 14px",borderRadius:999,border:`1px solid ${tab===t?TOKENS.borderStrong:TOKENS.border}`,background:tab===t?"rgba(255,255,255,0.10)":"transparent",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{t}</button>)}</div>
    {error&&<div role="alert" style={{color:TOKENS.danger,marginBottom:12}}>{error}</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>{filtered.map(it=><Link key={it.id} to={`/items/${it.id}`} style={{textDecoration:"none"}}><GlassCard hover><div style={{height:110,borderRadius:12,background:"linear-gradient(135deg,#4B7EDB,#1E2F8A)",display:"grid",placeItems:"center",color:"#fff",fontWeight:800,fontSize:20}}>{it.title.slice(0,2).toUpperCase()}</div><div style={{color:"#fff",fontWeight:700,marginTop:10}}>{it.title}</div><div style={{color:TOKENS.muted2,fontSize:12}}>{it.location.city} • {it.category} • {new Date(it.dateOccurred).toLocaleDateString()}</div><div style={{display:"flex",gap:6,marginTop:8}}><Badge tone={it.type==="LOST"?"warning":"success"}>{it.type}</Badge><Badge>{it.status}</Badge></div></GlassCard></Link>)}</div>
    {filtered.length===0&&!error&&<GlassCard style={{marginTop:14,textAlign:"center",color:TOKENS.muted2}}>No items in this view.</GlassCard>}
  </PageShell></>;
}
