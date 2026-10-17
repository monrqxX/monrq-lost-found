import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppNav from "../components/AppNav";
import { Badge, Button, GlassCard, PageShell, Textarea } from "../components/ui";
import { useApiData } from "../hooks/useApiData";
import { api, json } from "../lib/api";
import { TOKENS } from "../lib/tokens";

export default function MatchDetail() {
  const { matchId } = useParams();
  const { data, error } = useApiData<{ match: any; lost: any; found: any; canClaim: boolean }>(`/matches/${matchId}`);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  if (error || !data) return <><AppNav/><PageShell title={error ? "Match unavailable" : "Loading match…"}><GlassCard>{error || "Loading…"}</GlassCard></PageShell></>;

  const { match, lost, found } = data;
  const claim = async () => {
    setSaving(true);
    setActionError("");
    try {
      await api(`/matches/${match.id}/claims`, json("POST", { note: note.trim() }));
      setSubmitted(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not submit claim");
    } finally {
      setSaving(false);
    }
  };

  return <><AppNav/><PageShell title={`${match.score}% potential match`} subtitle="A similarity score is not proof of ownership." actions={<Badge tone="warning">{match.status}</Badge>}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {[lost, found].map((item: any, index: number) => item && <Link key={item.id} to={`/items/${item.id}`} style={{ textDecoration: "none" }}>
        <GlassCard hover>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: TOKENS.muted }}>{index === 0 ? "LOST" : "FOUND"}</div>
          <div style={{ color: "#fff", fontWeight: 800, marginTop: 6 }}>{item.title}</div>
          <div style={{ color: TOKENS.muted2, fontSize: 12, marginTop: 4 }}>{item.location.city} • {item.category} • {new Date(item.dateOccurred).toLocaleDateString()}</div>
          <div style={{ color: TOKENS.muted2, fontSize: 12, marginTop: 8 }}>{item.description}</div>
        </GlassCard>
      </Link>)}
    </div>
    <GlassCard style={{ marginTop: 14 }}><h3 style={{ fontWeight: 800, fontSize: 14 }}>Match details</h3><div style={{ marginTop: 8, color: TOKENS.muted2, fontSize: 13 }}>Similarity score: {match.score}%</div></GlassCard>
    {data.canClaim && <GlassCard style={{ marginTop: 14 }}>
      <h3 style={{ fontWeight: 800, fontSize: 14 }}>Claim the found item</h3>
      <p style={{ color: TOKENS.muted2, fontSize: 12, marginTop: 6 }}>Describe a private detail that helps verify it is yours. Only the item owner can review this note. Do not include ID numbers or other sensitive personal data.</p>
      {!submitted ? <>
        <div style={{ marginTop: 12 }}>
          <Textarea label="Private verification note" value={note} onChange={event => setNote(event.target.value)} placeholder="Describe a hidden detail only the true owner would know…" />
          {note.trim().length < 20 && <div style={{ color: TOKENS.muted2, fontSize: 11, marginTop: 4 }}>Enter at least 20 characters to help the owner verify your claim.</div>}
        </div>
        {actionError && <div role="alert" style={{ color: TOKENS.danger, fontSize: 12, marginTop: 10 }}>{actionError}</div>}
        <div style={{ marginTop: 12 }}><Button disabled={saving || note.trim().length < 20 || note.trim().length > 1000} onClick={claim}>{saving ? "Submitting…" : "Request to claim"}</Button></div>
      </> : <div style={{ marginTop: 12, color: TOKENS.success, fontSize: 13 }}>Claim submitted. The item owner will review it.</div>}
    </GlassCard>}
    {!data.canClaim && <GlassCard style={{ marginTop: 14, color: TOKENS.muted2, fontSize: 13 }}>Only the owner of the lost item can submit a claim for this match.</GlassCard>}
  </PageShell></>;
}
