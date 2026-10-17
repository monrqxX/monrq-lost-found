import { useState, type ChangeEvent } from "react"; import { useNavigate } from "react-router-dom";
import { GlassCard, Input, Textarea, Select, Button, Badge } from "../components/ui";
import AppNav from "../components/AppNav"; import { PageShell } from "../components/ui";
import { TOKENS } from "../lib/tokens"; import { CATEGORIES, COLORS } from "../lib/types";
import { api, json } from "../lib/api";
import { getItemImageUrl, MAX_ITEM_IMAGES, removeItemImage, uploadItemImages } from "../lib/itemImages";
export default function ReportLost(){
  const [step,setStep]=useState(1);
  const [form,setForm]=useState<any>({category:"electronics", subcategory:"", title:"", brand:"", model:"", color:"White", description:"", city:"Vijayapura", area:"Campus", placeName:"", date:new Date().toISOString().slice(0,10), time:"", serial:"", mark:"", privateDesc:"", imagePaths:[]});
  const nav=useNavigate(); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false); const [error,setError]=useState("");
  const choosePhotos=async(event:ChangeEvent<HTMLInputElement>)=>{
    const selected=Array.from(event.currentTarget.files||[]); event.currentTarget.value=""; if(!selected.length)return;
    if(form.imagePaths.length+selected.length>MAX_ITEM_IMAGES){setError("You can upload up to four photos per item.");return;}
    setError("");setUploading(true);
    try{const paths=await uploadItemImages(selected);setForm((current:any)=>({...current,imagePaths:[...current.imagePaths,...paths]}));}
    catch(e){setError(e instanceof Error?e.message:"Could not upload photos");}finally{setUploading(false);}
  };
  const removePhoto=async(path:string)=>{try{await removeItemImage(path);setForm((current:any)=>({...current,imagePaths:current.imagePaths.filter((item:string)=>item!==path)}));}catch(e){setError(e instanceof Error?e.message:"Could not remove photo");}};
  const submit=async()=>{
    setSaving(true);
    setError("");
    try { await api("/items", json("POST", {type:"LOST", category:form.category, subcategory:form.subcategory||form.category, title:form.title, description:form.description, brand:form.brand, model:form.model, color:form.color, dateOccurred:form.date, location:{city:form.city, area:form.area, placeName:form.placeName}, imagePaths:form.imagePaths, privateDetails:{serialNumber:form.serial, uniqueMark:form.mark, privateDescription:form.privateDesc}})); nav("/my-items"); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not publish item"); }
    finally { setSaving(false); }
  };
  return (<><AppNav/><PageShell title="Report lost item" subtitle="We'll help reunite you with what matters.">
    <div style={{display:"flex", gap:8, marginBottom:14}}>{[1,2,3,4,5].map(n=><div key={n} style={{flex:1, height:6, borderRadius:999, background: n<=step?TOKENS.accent:"rgba(255,255,255,0.12)"}} />)}</div>
    <GlassCard>
      <div style={{display:"flex", gap:10, marginBottom:12}}><Badge>Step {step} of 5</Badge><span style={{color:TOKENS.muted2, fontSize:12}}>{["What did you lose?","Where did you lose it?","When?","Photos","Private verification"][step-1]}</span></div>
      {step===1 && <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:12}}>
        <Select label="Category" options={[...CATEGORIES]} value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
        <Input label="Subcategory" value={form.subcategory} onChange={e=>setForm({...form, subcategory:e.target.value})} placeholder="earbuds, wallet..." />
        <Input label="Item name" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="Apple AirPods Pro" />
        <Input label="Brand" value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} placeholder="Apple" />
        <Input label="Model" value={form.model} onChange={e=>setForm({...form, model:e.target.value})} placeholder="AirPods Pro" />
        <Select label="Color" options={[...COLORS]} value={form.color} onChange={e=>setForm({...form, color:e.target.value})} />
        <div style={{gridColumn:"1 / -1"}}><Textarea label="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="White case, small scratch..." /></div>
      </div>}
      {step===2 && <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:12}}>
        <Input label="City" value={form.city} onChange={e=>setForm({...form, city:e.target.value})} />
        <Input label="Area" value={form.area} onChange={e=>setForm({...form, area:e.target.value})} />
        <Input label="Location name" value={form.placeName} onChange={e=>setForm({...form, placeName:e.target.value})} placeholder="Main Building" />
      </div>}
      {step===3 && <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:12}}>
        <Input label="Date" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} />
        <Input label="Approximate time" type="time" value={form.time} onChange={e=>setForm({...form, time:e.target.value})} />
      </div>}
      {step===4 && <div style={{display:"grid",gap:12}}><p style={{color:TOKENS.muted2,fontSize:13,margin:0}}>Add up to four JPG, PNG, or WebP photos. Each photo must be 5 MB or smaller. Photos are public, so crop out ID numbers, addresses, and hidden verification marks.</p><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple disabled={uploading||form.imagePaths.length>=MAX_ITEM_IMAGES} onChange={choosePhotos} aria-label="Upload item photos" style={{color:TOKENS.muted2}}/>{uploading&&<div role="status" style={{color:TOKENS.muted2,fontSize:12}}>Uploading securely…</div>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:10}}>{form.imagePaths.map((path:string)=><div key={path} style={{position:"relative"}}><img src={getItemImageUrl(path)} alt="Uploaded lost item" style={{width:"100%",height:100,objectFit:"cover",borderRadius:10}}/><button type="button" onClick={()=>void removePhoto(path)} aria-label="Remove photo" style={{position:"absolute",top:6,right:6,border:0,borderRadius:99,padding:"4px 8px",background:"rgba(0,0,0,.75)",color:"white",cursor:"pointer"}}>×</button></div>)}</div></div>}
      {step===5 && <div style={{display:"grid", gap:12}}>
        <div style={{background:"rgba(251,191,36,0.10)", border:"1px solid rgba(251,191,36,0.25)", padding:10, borderRadius:12, color:"#FBBF24", fontSize:12}}>Private details are never shown publicly.</div>
        <Input label="Serial number (private)" value={form.serial} onChange={e=>setForm({...form, serial:e.target.value})} />
        <Input label="Unique mark (private)" value={form.mark} onChange={e=>setForm({...form, mark:e.target.value})} />
        <Textarea label="Hidden feature (private)" value={form.privateDesc} onChange={e=>setForm({...form, privateDesc:e.target.value})} />
      </div>}
      {error && <div role="alert" style={{color:TOKENS.danger, fontSize:12, marginTop:12}}>{error}</div>}
      <div style={{display:"flex", justifyContent:"space-between", marginTop:16}}>
        <Button variant="ghost" onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1}>Back</Button>
        {step<5 ? <Button disabled={uploading} onClick={()=>setStep(s=>s+1)}>Continue</Button> : <Button disabled={saving||uploading} onClick={submit}>{saving?"Publishing...":"Publish"}</Button>}
      </div>
    </GlassCard>
  </PageShell></>);
}
