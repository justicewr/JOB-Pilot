import { useState, useEffect, useRef } from "react";

// ── Storage helpers ──────────────────────────────────────────────────────────
const store = {
  async get(key) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val)); } catch {}
  },
};

// ── Claude API ───────────────────────────────────────────────────────────────
async function callClaude(messages, system = "", useSearch = false, maxTokens = 1000) {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system,
    messages,
  };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").filter(Boolean).join("") || "";
}

// ── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0e1a", surface: "#111827", surfaceHigh: "#1a2235",
  border: "#1e2d45", accent: "#00d4ff", accentDim: "#0099bb",
  gold: "#f0a500", text: "#e8f0fe", muted: "#6b7fa3",
  success: "#00e5a0", danger: "#ff4d6d",
};

// ── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};color:${C.text};font-family:'DM Mono',monospace;min-height:100vh;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:${C.surface};}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
  .app{display:flex;min-height:100vh;}

  .sidebar{width:220px;background:${C.surface};border-right:1px solid ${C.border};display:flex;flex-direction:column;padding:28px 0;position:fixed;top:0;left:0;height:100vh;z-index:10;}
  .sidebar-logo{padding:0 24px 32px;font-family:'Syne',sans-serif;font-weight:800;font-size:18px;color:${C.accent};letter-spacing:-.5px;line-height:1.2;}
  .sidebar-logo span{display:block;font-size:10px;color:${C.muted};font-weight:400;letter-spacing:2px;text-transform:uppercase;font-family:'DM Mono',monospace;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:11px 24px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};cursor:pointer;transition:all .2s;border-left:2px solid transparent;}
  .nav-item:hover{color:${C.text};background:${C.surfaceHigh};}
  .nav-item.active{color:${C.accent};border-left-color:${C.accent};background:${C.surfaceHigh};}
  .nav-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;}
  .nav-badge{margin-left:auto;background:${C.accent};color:${C.bg};font-size:9px;padding:2px 6px;border-radius:20px;font-weight:700;}
  .nav-section{padding:16px 24px 6px;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${C.border};}

  .main{margin-left:220px;flex:1;padding:48px;}
  .page-header{margin-bottom:40px;}
  .page-tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.accent};margin-bottom:8px;}
  .page-title{font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:${C.text};line-height:1.1;}
  .page-sub{font-size:13px;color:${C.muted};margin-top:8px;line-height:1.6;}

  .card{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:28px;}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-family:'DM Mono',monospace;cursor:pointer;transition:all .2s;border:none;font-weight:500;}
  .btn-primary{background:${C.accent};color:${C.bg};}
  .btn-primary:hover{background:${C.accentDim};}
  .btn-outline{background:transparent;border:1px solid ${C.border};color:${C.text};}
  .btn-outline:hover{border-color:${C.accent};color:${C.accent};}
  .btn-ghost{background:transparent;color:${C.muted};border:none;}
  .btn-ghost:hover{color:${C.text};}
  .btn-gold{background:${C.gold};color:${C.bg};}
  .btn-gold:hover{opacity:.85;}
  .btn-danger{background:rgba(255,77,109,.12);color:${C.danger};border:1px solid rgba(255,77,109,.2);}
  .btn-success{background:rgba(0,229,160,.12);color:${C.success};border:1px solid rgba(0,229,160,.2);}
  .btn:disabled{opacity:.4;cursor:not-allowed;}

  .pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:10px;letter-spacing:1px;text-transform:uppercase;font-weight:500;}
  .pill-green{background:rgba(0,229,160,.12);color:${C.success};}
  .pill-blue{background:rgba(0,212,255,.12);color:${C.accent};}
  .pill-gold{background:rgba(240,165,0,.12);color:${C.gold};}
  .pill-red{background:rgba(255,77,109,.12);color:${C.danger};}
  .pill-gray{background:rgba(107,127,163,.12);color:${C.muted};}

  .upload-zone{border:2px dashed ${C.border};border-radius:12px;padding:48px;text-align:center;cursor:pointer;transition:all .25s;}
  .upload-zone:hover,.upload-zone.drag{border-color:${C.accent};background:rgba(0,212,255,.04);}
  .upload-icon{font-size:40px;margin-bottom:16px;}
  .upload-label{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:${C.text};margin-bottom:6px;}
  .upload-hint{font-size:11px;color:${C.muted};}

  .chat-window{background:${C.surfaceHigh};border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:16px;min-height:420px;max-height:520px;overflow-y:auto;}
  .msg{display:flex;gap:12px;align-items:flex-start;animation:fadeUp .3s ease;}
  .msg.user{flex-direction:row-reverse;}
  .msg-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
  .msg-avatar.ai{background:rgba(0,212,255,.15);color:${C.accent};}
  .msg-avatar.user{background:rgba(240,165,0,.15);color:${C.gold};}
  .msg-bubble{background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:12px 16px;font-size:13px;line-height:1.7;max-width:78%;color:${C.text};}
  .msg.user .msg-bubble{background:rgba(0,212,255,.08);border-color:rgba(0,212,255,.2);}
  .chat-input-row{display:flex;gap:10px;margin-top:12px;}
  .chat-input{flex:1;background:${C.surfaceHigh};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;color:${C.text};font-family:'DM Mono',monospace;font-size:13px;resize:none;outline:none;transition:border .2s;}
  .chat-input:focus{border-color:${C.accent};}

  .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .profile-section{background:${C.surfaceHigh};border-radius:10px;padding:20px;}
  .profile-section-title{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.accent};margin-bottom:12px;}
  .tag-list{display:flex;flex-wrap:wrap;gap:6px;}
  .tag{background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.15);color:${C.accent};padding:3px 10px;border-radius:20px;font-size:11px;}
  .tag.gold{background:rgba(240,165,0,.08);border-color:rgba(240,165,0,.2);color:${C.gold};}
  .tag.green{background:rgba(0,229,160,.08);border-color:rgba(0,229,160,.2);color:${C.success};}

  .table-wrap{overflow-x:auto;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th{text-align:left;padding:10px 14px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};border-bottom:1px solid ${C.border};font-weight:500;}
  td{padding:14px;border-bottom:1px solid ${C.border};color:${C.text};vertical-align:middle;}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:${C.surfaceHigh};}
  .empty-state{text-align:center;padding:60px 24px;color:${C.muted};}
  .empty-icon{font-size:36px;margin-bottom:12px;}
  .empty-label{font-family:'Syne',sans-serif;font-size:15px;color:${C.text};margin-bottom:6px;}
  .empty-hint{font-size:12px;}

  .notif{background:rgba(0,212,255,.07);border:1px solid rgba(0,212,255,.2);border-radius:8px;padding:10px 16px;font-size:12px;color:${C.accent};display:flex;align-items:center;gap:10px;margin-bottom:20px;}
  .notif-gold{background:rgba(240,165,0,.07);border-color:rgba(240,165,0,.2);color:${C.gold};}
  .notif-green{background:rgba(0,229,160,.07);border-color:rgba(0,229,160,.2);color:${C.success};}

  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
  .flex-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
  .ml-auto{margin-left:auto;}
  .divider{height:1px;background:${C.border};margin:24px 0;}

  /* Job cards */
  .job-grid{display:flex;flex-direction:column;gap:14px;}
  .job-card{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:22px;transition:border .2s;position:relative;overflow:hidden;}
  .job-card:hover{border-color:rgba(0,212,255,.3);}
  .job-card.interested{border-color:${C.success};background:rgba(0,229,160,.03);}
  .job-card.saved{border-color:${C.gold};background:rgba(240,165,0,.03);}
  .job-card.dismissed{opacity:.35;filter:grayscale(1);}
  .job-card-header{display:flex;align-items:flex-start;gap:14px;margin-bottom:12px;}
  .job-company-logo{width:40px;height:40px;border-radius:8px;background:${C.surfaceHigh};border:1px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
  .job-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:${C.text};margin-bottom:3px;}
  .job-company{font-size:12px;color:${C.accent};}
  .job-meta{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
  .job-meta-item{font-size:11px;color:${C.muted};display:flex;align-items:center;gap:4px;}
  .job-scope{font-size:12px;color:${C.muted};line-height:1.7;margin-bottom:14px;}
  .job-actions{display:flex;gap:8px;align-items:center;}
  .match-score{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:11px;color:${C.muted};}
  .match-bar{width:60px;height:4px;background:${C.border};border-radius:2px;overflow:hidden;}
  .match-fill{height:100%;border-radius:2px;transition:width .6s ease;}

  /* digest filters */
  .filter-bar{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;align-items:center;}
  .filter-btn{padding:6px 14px;border-radius:20px;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all .2s;border:1px solid ${C.border};background:transparent;color:${C.muted};font-family:'DM Mono',monospace;}
  .filter-btn.active{background:${C.accent};color:${C.bg};border-color:${C.accent};}
  .filter-btn:hover:not(.active){border-color:${C.accent};color:${C.accent};}

  /* digest history */
  .history-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;cursor:pointer;transition:background .2s;}
  .history-item:hover{background:${C.surfaceHigh};}
  .history-date{font-size:11px;color:${C.muted};}
  .history-count{font-size:11px;color:${C.text};}

  /* progress bar for search */
  .search-progress{background:${C.surfaceHigh};border-radius:12px;padding:32px;text-align:center;}
  .progress-track{height:3px;background:${C.border};border-radius:2px;margin:20px 0;overflow:hidden;}
  .progress-fill{height:100%;background:linear-gradient(90deg,${C.accent},${C.success});border-radius:2px;animation:progressAnim 2.5s ease infinite;}
  @keyframes progressAnim{0%{width:0;margin-left:0;}50%{width:60%;margin-left:20%;}100%{width:0;margin-left:100%;}}

  .dots span{animation:blink 1.2s infinite;}
  .dots span:nth-child(2){animation-delay:.2s;}
  .dots span:nth-child(3){animation-delay:.4s;}
  @keyframes blink{0%,80%,100%{opacity:.2;}40%{opacity:1;}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

  .steps{display:flex;gap:0;margin-bottom:36px;}
  .step{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};}
  .step.active{color:${C.accent};}
  .step.done{color:${C.success};}
  .step-num{width:24px;height:24px;border-radius:50%;border:1px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;}
  .step-line{width:40px;height:1px;background:${C.border};margin:0 8px;}

  /* Applications / Phase 3 */
  .app-queue{display:flex;flex-direction:column;gap:12px;}
  .app-queue-card{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:20px;display:flex;align-items:center;gap:16px;cursor:pointer;transition:border .2s;}
  .app-queue-card:hover{border-color:rgba(0,212,255,.3);}
  .app-queue-card.active{border-color:${C.accent};background:rgba(0,212,255,.03);}
  .app-queue-info{flex:1;}
  .app-queue-title{font-family:'Syne',sans-serif;font-weight:700;font-size:14px;margin-bottom:3px;}
  .app-queue-meta{font-size:11px;color:${C.muted};}
  .doc-panel{background:${C.surfaceHigh};border-radius:12px;padding:24px;margin-top:0;}
  .doc-tabs{display:flex;gap:0;margin-bottom:20px;border-bottom:1px solid ${C.border};}
  .doc-tab{padding:10px 20px;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;color:${C.muted};transition:all .2s;border-bottom:2px solid transparent;margin-bottom:-1px;}
  .doc-tab.active{color:${C.accent};border-bottom-color:${C.accent};}
  .doc-tab:hover:not(.active){color:${C.text};}
  .edit-item{background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:16px;margin-bottom:10px;}
  .edit-section-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${C.accent};margin-bottom:6px;}
  .edit-what{font-size:12px;color:${C.text};margin-bottom:6px;line-height:1.6;font-weight:500;}
  .edit-why{font-size:11px;color:${C.muted};line-height:1.6;margin-bottom:8px;}
  .edit-before{font-size:11px;color:${C.danger};margin-bottom:4px;padding:8px 10px;background:rgba(255,77,109,.05);border-radius:6px;line-height:1.6;border-left:2px solid ${C.danger};}
  .edit-after{font-size:11px;color:${C.success};padding:8px 10px;background:rgba(0,229,160,.05);border-radius:6px;line-height:1.6;border-left:2px solid ${C.success};}
  .cover-letter{font-size:13px;line-height:1.9;color:${C.text};white-space:pre-wrap;}
  .gen-progress{background:${C.surfaceHigh};border-radius:12px;padding:28px;text-align:center;}
`;

// ── Helpers ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split("T")[0];
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function matchColor(score) {
  if (score >= 80) return C.success;
  if (score >= 60) return C.gold;
  return C.muted;
}
function companyEmoji(name = "") {
  const emojis = ["🏢", "🚀", "💡", "🌐", "⚡", "🔗", "💎", "🛠️", "🌍", "🏗️"];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return emojis[h % emojis.length];
}

// ── Job Search System Prompt ─────────────────────────────────────────────────
function buildSearchPrompt(cvProfile, talentProfile) {
  return `You are a job search assistant. Use web search to find REAL, CURRENT job listings that match this candidate's profile.

CANDIDATE PROFILE:
- Name: ${cvProfile?.name || "Candidate"}
- Current Title: ${cvProfile?.currentTitle || ""}
- Skills: ${(cvProfile?.skills || []).join(", ")}
- Industries: ${(cvProfile?.industries || []).join(", ")}
- Seniority: ${cvProfile?.seniority || ""}
- Excited About: ${(talentProfile?.excitedAbout || []).join(", ")}
- Web3 Interest: ${talentProfile?.web3Interest || "Yes, keen on Web3/blockchain roles"}
- Ideal Role: ${talentProfile?.idealRole || ""}
- Salary Range: ${talentProfile?.salaryRange || ""}
- Work Style: Remote or hybrid preferred, global locations considered

SEARCH INSTRUCTIONS:
1. Search for relevant job listings across multiple boards: LinkedIn, Indeed, Glassdoor, RemoteOK, Crypto.jobs, Web3.career
2. Find 6-10 real current job postings that match the profile
3. Include a mix of Web3/blockchain and traditional tech/business roles
4. Include remote-friendly roles

Return ONLY a JSON array. Each job object must have:
{
  "id": "unique string",
  "title": "job title",
  "company": "company name",
  "location": "city, country OR Remote",
  "remote": true/false,
  "salary": "salary range or null",
  "scope": "2-3 sentence summary of what the role involves",
  "tags": ["tag1","tag2","tag3"],
  "matchScore": 0-100,
  "matchReason": "one sentence why this matches the candidate",
  "source": "job board name",
  "url": "direct job URL or job board search URL",
  "postedDate": "approximate date or 'Recent'"
}

Return ONLY the JSON array. No markdown, no explanation.`;
}

// ── Phase 1 Screens (preserved) ──────────────────────────────────────────────

function Welcome({ onStart, hasCV, hasTalent, onExport, onImportText }) {
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importError, setImportError] = useState("");

  return (
    <div>
      <div className="page-header">
        <div className="page-tag">Welcome</div>
        <div className="page-title">Your Job Hunting<br />Assistant</div>
        <div className="page-sub">AI-powered · Global · Web3-ready · Built around you</div>
      </div>
      {(hasCV || hasTalent) && (
        <div className="notif">✦ Saved data detected — you can skip steps already completed.</div>
      )}
      {!hasCV && !hasTalent && !showPaste && (
        <div className="notif notif-gold">
          ✦ Have a Phase 1 profile? Paste your exported JSON to skip setup.
          <button className="btn btn-gold" style={{ marginLeft: "auto", padding: "5px 14px", fontSize: 11 }}
            onClick={() => setShowPaste(true)}>
            ⬆ Import Profile
          </button>
        </div>
      )}
      {showPaste && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 600 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Paste your Phase 1 profile JSON</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.7 }}>
            In Phase 1, click <strong style={{ color: C.accent }}>"Export Profile for Phase 2"</strong> → copy all the text from the modal → paste it below.
          </div>
          <textarea className="chat-input" rows={8}
            placeholder='Paste the JSON here...'
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setImportError(""); }}
            style={{ width: "100%", marginBottom: 8 }} />
          {importError && <div style={{ color: C.danger, fontSize: 11, marginBottom: 8 }}>{importError}</div>}
          <div className="flex-row">
            <button className="btn btn-primary" disabled={!pasteText.trim()}
              onClick={() => {
                const err = onImportText(pasteText);
                if (err) setImportError(err);
                else { setShowPaste(false); setPasteText(""); }
              }}>
              Load Profile →
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowPaste(false); setPasteText(""); }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 700 }}>
        <div className="card" style={{ borderColor: hasCV ? C.success : C.border }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📄</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            CV Profile {hasCV && <span style={{ color: C.success, fontSize: 11 }}>✓ Done</span>}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>Upload your CV and let AI extract your skills, experience, and strengths.</div>
          <button className="btn btn-primary" onClick={() => onStart("cv")}>{hasCV ? "Re-upload CV" : "Upload CV →"}</button>
        </div>
        <div className="card" style={{ borderColor: hasTalent ? C.success : C.border }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🧠</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            Talent Mapping {hasTalent && <span style={{ color: C.success, fontSize: 11 }}>✓ Done</span>}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>A conversational AI interview to map your personality, work style, and career goals.</div>
          <button className="btn btn-gold" onClick={() => onStart("talent")} disabled={!hasCV}>{hasTalent ? "Redo Interview" : "Start Interview →"}</button>
          {!hasCV && <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>Upload CV first</div>}
        </div>
      </div>
      {hasCV && hasTalent && (
        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-outline" onClick={() => onStart("profile")}>View My Profile →</button>
          <button className="btn btn-primary" onClick={() => onStart("digest")}>Go to Job Digest →</button>
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={onExport}>⬇ Export Profile</button>
        </div>
      )}
    </div>
  );
}

function CVUpload({ onDone, existing }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [extracted, setExtracted] = useState(existing || null);
  const [parseError, setParseError] = useState("");
  const inputRef = useRef();

  async function processFile(f) {
    setFile(f);
    setLoading(true);
    setParseError("");
    setExtracted(null);

    try {
      const ext = f.name.split(".").pop().toLowerCase();
      let messages;

      if (ext === "pdf") {
        // Send PDF as base64 document — Claude reads it natively
        setLoadingStep("Reading PDF...");
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(e.target.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(f);
        });
        messages = [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 }
            },
            {
              type: "text",
              text: `Parse this CV/resume into JSON with these exact fields: name, currentTitle, summary (2 sentences max), skills (array of strings), experience (array of {title, company, years}), education (array of strings), industries (array of strings), seniority (one of: Junior/Mid/Senior/Lead/Executive), languages (array of strings). Return ONLY valid JSON, no markdown, no explanation.`
            }
          ]
        }];
      } else if (ext === "txt") {
        // Plain text — read directly
        setLoadingStep("Reading text file...");
        const text = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.onerror = rej;
          r.readAsText(f);
        });
        messages = [{
          role: "user",
          content: `Parse this CV/resume into JSON with these exact fields: name, currentTitle, summary (2 sentences max), skills (array of strings), experience (array of {title, company, years}), education (array of strings), industries (array of strings), seniority (one of: Junior/Mid/Senior/Lead/Executive), languages (array of strings). Return ONLY valid JSON, no markdown, no explanation.\n\nCV:\n${text.slice(0, 8000)}`
        }];
      } else {
        // DOCX and others — read as text (partial extraction)
        setLoadingStep("Reading document...");
        const text = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.onerror = rej;
          r.readAsText(f, "utf-8");
        });
        // Strip binary garbage, keep printable ASCII
        const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
        if (cleaned.length < 100) {
          setParseError("Could not read this file format. Please convert your CV to PDF or TXT and try again.");
          setLoading(false);
          return;
        }
        messages = [{
          role: "user",
          content: `Parse this CV/resume text into JSON with these exact fields: name, currentTitle, summary (2 sentences max), skills (array of strings), experience (array of {title, company, years}), education (array of strings), industries (array of strings), seniority (one of: Junior/Mid/Senior/Lead/Executive), languages (array of strings). Return ONLY valid JSON, no markdown, no explanation.\n\nCV text:\n${cleaned.slice(0, 8000)}`
        }];
      }

      setLoadingStep("Extracting your profile with AI...");
      const reply = await callClaude(
        messages,
        "You are a CV parsing assistant. Return ONLY valid JSON matching the requested structure. No markdown fences, no explanation, just the JSON object.",
        false,
        2000
      );

      // Robust JSON extraction
      const clean = reply.replace(/```json|```/g, "").trim();
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("No JSON found in response");

      const profile = JSON.parse(clean.slice(start, end + 1));

      // Validate we got something useful
      if (!profile.name && !profile.currentTitle && !profile.skills) {
        throw new Error("Profile appears empty — CV may not have been readable");
      }

      setExtracted(profile);
      await store.set("cv_profile", profile);

    } catch (e) {
      console.error("CV parse error:", e);
      setParseError(`Could not parse your CV: ${e.message}. Try converting to PDF or plain TXT format.`);
    }
    setLoading(false);
    setLoadingStep("");
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-tag">Step 1 of 2</div>
        <div className="page-title">Upload Your CV</div>
        <div className="page-sub">We'll extract your profile automatically. Best results with PDF or TXT format.</div>
      </div>
      {!extracted && !loading && (
        <>
          <div className={`upload-zone ${drag ? "drag" : ""}`} style={{ maxWidth: 520 }}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            onClick={() => inputRef.current.click()}>
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }}
              onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
            <div className="upload-icon">📎</div>
            <div className="upload-label">{file ? file.name : "Drop your CV here"}</div>
            <div className="upload-hint">PDF recommended · TXT also works · DOC/DOCX may have limited support</div>
          </div>
          {parseError && (
            <div style={{ marginTop: 16, maxWidth: 520, background: "rgba(255,77,109,.08)", border: "1px solid rgba(255,77,109,.2)", borderRadius: 8, padding: "12px 16px", fontSize: 12, color: C.danger, lineHeight: 1.7 }}>
              ⚠ {parseError}
            </div>
          )}
          <div style={{ marginTop: 16, maxWidth: 520, fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
            💡 <strong style={{ color: C.text }}>Tip:</strong> For best results, export your CV as a PDF from Word or Google Docs before uploading.
            Alternatively, paste your CV content into a <strong style={{ color: C.text }}>.txt</strong> file.
          </div>
        </>
      )}
      {loading && (
        <div style={{ padding: "32px 0", color: C.accent, fontSize: 13 }}>
          {loadingStep} <span className="dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      )}
      {extracted && !loading && (
        <div style={{ maxWidth: 700 }}>
          <div className="notif">✦ Profile extracted — review below and confirm.</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>{extracted.name}</div>
            <div style={{ color: C.accent, fontSize: 13, margin: "4px 0 10px" }}>{extracted.currentTitle} · <span style={{ color: C.muted }}>{extracted.seniority}</span></div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{extracted.summary}</div>
          </div>
          <div className="profile-grid">
            <div className="profile-section">
              <div className="profile-section-title">Skills</div>
              <div className="tag-list">{(extracted.skills || []).map(s => <span key={s} className="tag">{s}</span>)}</div>
            </div>
            <div className="profile-section">
              <div className="profile-section-title" style={{ color: C.gold }}>Industries</div>
              <div className="tag-list">{(extracted.industries || []).map(i => <span key={i} className="tag gold">{i}</span>)}</div>
            </div>
            <div className="profile-section">
              <div className="profile-section-title">Experience</div>
              {(extracted.experience || []).map((x, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 8 }}>
                  <div style={{ color: C.text }}>{x.title}</div>
                  <div style={{ color: C.muted }}>{x.company} · {x.years}</div>
                </div>
              ))}
            </div>
            <div className="profile-section">
              <div className="profile-section-title">Education & Languages</div>
              {(extracted.education || []).map((e, i) => <div key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{e}</div>)}
              <div className="tag-list" style={{ marginTop: 8 }}>{(extracted.languages || []).map(l => <span key={l} className="tag green">{l}</span>)}</div>
            </div>
          </div>
          <div className="flex-row" style={{ marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => onDone(extracted)}>Confirm & Continue →</button>
            <button className="btn btn-ghost" onClick={() => { setExtracted(null); setFile(null); setParseError(""); }}>Re-upload</button>
          </div>
        </div>
      )}
    </div>
  );
}

const INTERVIEW_SYSTEM = `You are a warm, insightful career coach conducting a talent mapping interview. Ask one question at a time. Be conversational and empathetic. Cover naturally: career goals, skills confidence, work style, personality/pressure handling, motivations and values, Web3/blockchain interest, industries excited about, salary expectations, location preferences, deal-breakers, ideal role and team. After 12-15 exchanges end with: INTERVIEW_COMPLETE: followed by JSON: {strengths,workStyle,personality,goals,excitedAbout,salaryRange,dealBreakers,idealRole,culturefit,web3Interest}. Start with a warm welcome.`;

function TalentInterview({ cvProfile, onDone, existing }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { if (existing) { setDone(true); return; } startInterview(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function startInterview() {
    setLoading(true);
    const ctx = cvProfile ? `Candidate CV: ${JSON.stringify(cvProfile)}` : "";
    const reply = await callClaude([{ role: "user", content: ctx ? `${ctx}\n\nPlease start.` : "Please start." }], INTERVIEW_SYSTEM);
    setMessages([{ role: "assistant", content: reply }]);
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const newMsgs = [...messages, { role: "user", content: input }];
    setMessages(newMsgs); setInput(""); setLoading(true);
    const reply = await callClaude(newMsgs, INTERVIEW_SYSTEM);
    const finalMsgs = [...newMsgs, { role: "assistant", content: reply }];
    setMessages(finalMsgs);
    if (reply.includes("INTERVIEW_COMPLETE:")) {
      try {
        const jsonStr = reply.split("INTERVIEW_COMPLETE:")[1].trim().replace(/```json|```/g, "").trim();
        const raw = JSON.parse(jsonStr);
        const talent = sanitizeTalentProfile(raw);
        await store.set("talent_profile", talent);
        setTimeout(() => onDone(talent), 600);
      } catch {}
    }
    setLoading(false);
  }

  if (done && existing) return (
    <div>
      <div className="page-header"><div className="page-tag">Step 2 of 2</div><div className="page-title">Talent Mapping</div></div>
      <div className="notif">✦ Interview already completed.</div>
      <div className="flex-row">
        <button className="btn btn-gold" onClick={() => { setDone(false); startInterview(); }}>Redo Interview</button>
        <button className="btn btn-primary" onClick={() => onDone(existing)}>View My Profile →</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-tag">Step 2 of 2</div>
        <div className="page-title">Talent Mapping Interview</div>
        <div className="page-sub">Answer naturally — the AI will follow up based on what you share.</div>
      </div>
      <div style={{ maxWidth: 680 }}>
        <div className="chat-window">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "user" : ""}`}>
              <div className={`msg-avatar ${m.role === "user" ? "user" : "ai"}`}>{m.role === "user" ? "Y" : "AI"}</div>
              <div className="msg-bubble" style={{ whiteSpace: "pre-wrap" }}>
                {m.role === "assistant" && m.content.includes("INTERVIEW_COMPLETE:") ? m.content.split("INTERVIEW_COMPLETE:")[0].trim() : m.content}
              </div>
            </div>
          ))}
          {loading && <div className="msg"><div className="msg-avatar ai">AI</div><div className="msg-bubble" style={{ color: C.muted }}><span className="dots"><span>●</span><span>●</span><span>●</span></span></div></div>}
          <div ref={bottomRef} />
        </div>
        <div className="chat-input-row">
          <textarea className="chat-input" rows={2} placeholder="Type your answer..." value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}

function TalentProfile({ profile, cvProfile, onEdit }) {
  if (!profile) return (
    <div>
      <div className="page-header"><div className="page-tag">Profile</div><div className="page-title">Talent Profile</div></div>
      <div className="notif">Complete the talent mapping interview to generate your profile.</div>
    </div>
  );
  return (
    <div>
      <div className="page-header">
        <div className="page-tag">Your Profile</div>
        <div className="page-title">Talent Profile</div>
        <div className="page-sub">Generated from your CV and interview. Powers all job matching.</div>
      </div>
      <div style={{ maxWidth: 760 }}>
        {cvProfile && (
          <div className="card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20 }}>{cvProfile.name}</div>
              <div style={{ color: C.accent, fontSize: 12 }}>{cvProfile.currentTitle} · {cvProfile.seniority}</div>
            </div>
            <div className="ml-auto"><span className="pill pill-green">✓ Profile Complete</span></div>
          </div>
        )}
        <div className="profile-grid" style={{ marginBottom: 20 }}>
          <div className="profile-section">
            <div className="profile-section-title">Top Strengths</div>
            <div className="tag-list">{(profile.strengths || []).map(s => <span key={s} className="tag">{s}</span>)}</div>
          </div>
          <div className="profile-section">
            <div className="profile-section-title" style={{ color: C.gold }}>Excited About</div>
            <div className="tag-list">{(profile.excitedAbout || []).map(s => <span key={s} className="tag gold">{s}</span>)}</div>
          </div>
        </div>
        <div className="two-col" style={{ marginBottom: 20 }}>
          <div className="profile-section"><div className="profile-section-title">Work Style</div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>{profile.workStyle}</div></div>
          <div className="profile-section"><div className="profile-section-title">Personality Dimension</div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>{profile.personality}</div></div>
          <div className="profile-section"><div className="profile-section-title">Career Goals</div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>{profile.goals}</div></div>
          <div className="profile-section"><div className="profile-section-title">Ideal Role & Culture</div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>{profile.idealRole}</div><div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>{profile.culturefit}</div></div>
        </div>
        <div className="two-col" style={{ marginBottom: 20 }}>
          <div className="profile-section"><div className="profile-section-title" style={{ color: C.success }}>Web3 Interest</div><div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>{profile.web3Interest}</div></div>
          <div className="profile-section"><div className="profile-section-title">Salary Range</div><div style={{ fontSize: 14, color: C.gold, fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>{profile.salaryRange}</div></div>
        </div>
        <div className="profile-section" style={{ marginBottom: 20 }}>
          <div className="profile-section-title" style={{ color: C.danger }}>Deal-Breakers</div>
          <div className="tag-list">{(profile.dealBreakers || []).map(d => <span key={d} className="pill pill-red">{d}</span>)}</div>
        </div>
        <button className="btn btn-outline" onClick={onEdit}>Redo Interview</button>
      </div>
    </div>
  );
}

// ── Phase 2: Daily Digest ────────────────────────────────────────────────────

// ── Sanitise job data from AI (fields may come back as objects) ───────────────
function str(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(", ");
  if (typeof v === "object") return Object.values(v).filter(Boolean).map(str).join(", ");
  return String(v);
}

function toStrArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  if (typeof v === "object") return Object.values(v).map(str).filter(Boolean);
  return String(v).split(/[,;]/).map(s => s.trim()).filter(Boolean);
}

function sanitizeTalentProfile(p) {
  if (!p) return p;
  return {
    strengths: toStrArray(p.strengths),
    workStyle: str(p.workStyle),
    personality: str(p.personality),
    goals: str(p.goals),
    excitedAbout: toStrArray(p.excitedAbout),
    salaryRange: str(p.salaryRange),
    dealBreakers: toStrArray(p.dealBreakers),
    idealRole: str(p.idealRole),
    culturefit: str(p.culturefit),
    web3Interest: str(p.web3Interest),
  };
}
function sanitizeJob(j) {
  return {
    ...j,
    id: str(j.id) || Math.random().toString(36).slice(2),
    title: str(j.title),
    company: str(j.company),
    location: str(j.location),
    remote: typeof j.remote === "boolean" ? j.remote : str(j.remote).toLowerCase().includes("true") || str(j.location).toLowerCase().includes("remote"),
    salary: str(j.salary) || null,
    scope: str(j.scope),
    tags: Array.isArray(j.tags) ? j.tags.map(str).filter(Boolean) : [],
    matchScore: typeof j.matchScore === "number" ? j.matchScore : parseInt(j.matchScore) || 70,
    matchReason: str(j.matchReason),
    source: str(j.source),
    url: str(j.url),
    postedDate: str(j.postedDate) || "Recent",
    action: j.action || null,
  };
}

function JobCard({ job, onAction }) {
  const score = job.matchScore || 70;
  return (
    <div className={`job-card ${job.action || ""}`}>
      <div className="job-card-header">
        <div className="job-company-logo">{companyEmoji(job.company)}</div>
        <div style={{ flex: 1 }}>
          <div className="job-title">{job.title}</div>
          <div className="job-company">{job.company}</div>
        </div>
        {job.action === "interested" && <span className="pill pill-green">✓ Interested</span>}
        {job.action === "saved" && <span className="pill pill-gold">🔖 Saved</span>}
        {job.action === "dismissed" && <span className="pill pill-gray">✕ Dismissed</span>}
      </div>

      <div className="job-meta">
        <span className="job-meta-item">📍 {job.location}</span>
        {job.remote && <span className="pill pill-green" style={{ fontSize: 9 }}>Remote</span>}
        {job.salary && <span className="job-meta-item">💰 {job.salary}</span>}
        <span className="job-meta-item">🗓 {job.postedDate}</span>
        <span className="job-meta-item">via {job.source}</span>
      </div>

      <div className="job-scope">{job.scope}</div>

      <div className="tag-list" style={{ marginBottom: 14 }}>
        {(job.tags || []).map(t => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
      </div>

      <div className="job-actions">
        {!job.action && (
          <>
            <button className="btn btn-success" style={{ padding: "7px 14px", fontSize: 11 }} onClick={() => onAction(job.id, "interested")}>✅ Interested</button>
            <button className="btn btn-outline" style={{ padding: "7px 14px", fontSize: 11 }} onClick={() => onAction(job.id, "saved")}>🔖 Save</button>
            <button className="btn btn-danger" style={{ padding: "7px 14px", fontSize: 11 }} onClick={() => onAction(job.id, "dismissed")}>✕ Dismiss</button>
          </>
        )}
        {job.action === "interested" && (
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => onAction(job.id, null)}>Undo</button>
        )}
        {job.action === "saved" && (
          <>
            <button className="btn btn-success" style={{ padding: "7px 14px", fontSize: 11 }} onClick={() => onAction(job.id, "interested")}>✅ Interested</button>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => onAction(job.id, null)}>Undo</button>
          </>
        )}
        {job.action === "dismissed" && (
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => onAction(job.id, null)}>Undo</button>
        )}
        <div className="match-score">
          <span style={{ color: matchColor(score) }}>{score}% match</span>
          <div className="match-bar">
            <div className="match-fill" style={{ width: `${score}%`, background: matchColor(score) }} />
          </div>
        </div>
        <a href={job.url} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: 11, color: C.accent, textDecoration: "none" }}>View →</a>
      </div>

      {job.matchReason && (
        <div style={{ marginTop: 10, fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          ✦ {job.matchReason}
        </div>
      )}
    </div>
  );
}

function Digest({ cvProfile, talentProfile, onSendToTracker }) {
  const [digests, setDigests] = useState({});
  const [activeDigest, setActiveDigest] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState("");
  const [filter, setFilter] = useState("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await store.get("digests");
      if (saved) {
        // Sanitize all stored jobs in case old data has object fields
        const sanitized = {};
        for (const [date, digest] of Object.entries(saved)) {
          sanitized[date] = { ...digest, jobs: (digest.jobs || []).map(sanitizeJob) };
        }
        setDigests(sanitized);
        const dates = Object.keys(sanitized).sort().reverse();
        if (dates.length) setActiveDigest(dates[0]);
      }
      setLoaded(true);
    })();
  }, []);

  const canSearch = !!(cvProfile && talentProfile);
  const todayKey = today();
  const alreadyRanToday = !!digests[todayKey];

  async function runSearch() {
    setSearching(true);
    setSearchStep("Analysing your profile...");
    await new Promise(r => setTimeout(r, 600));

    const skills = (cvProfile?.skills || []).slice(0, 6).join(", ");
    const industries = (cvProfile?.industries || []).join(", ");
    const title = cvProfile?.currentTitle || "professional";
    const web3 = talentProfile?.web3Interest || "";
    const idealRole = talentProfile?.idealRole || "";

    try {
      // Step 1 — web search for real job listings
      setSearchStep("Searching job boards for matching roles...");
      const searchQuery = `Find current job listings (posted in the last 30 days) for someone with these skills: ${skills}. Industries: ${industries}. Current title: ${title}. ${web3 ? "Include Web3/blockchain/crypto roles." : ""} ${idealRole ? "Ideal role: " + idealRole + "." : ""} Search across LinkedIn, Indeed, RemoteOK, Glassdoor, Crypto.jobs, Web3.career. Include remote-friendly and global roles. For each job found, note the job title, company, location, salary if listed, and a brief description of the role.`;

      const searchResults = await callClaude(
        [{ role: "user", content: searchQuery }],
        "You are a job search assistant. Use web search to find real current job listings. Summarise what you find clearly — job title, company, location, salary if stated, brief description, and the URL or source.",
        true,
        2000
      );

      if (!searchResults || searchResults.length < 50) {
        setSearchStep("No results returned from search. Please try again.");
        setTimeout(() => setSearching(false), 2500);
        return;
      }

      // Step 2 — format search results into structured JSON
      setSearchStep("Formatting results for your digest...");
      const formatPrompt = `You are formatting job search results into structured data.

Here are the raw job search results:
${searchResults}

Candidate profile for match scoring:
- Skills: ${skills}
- Title: ${title}
- Web3 interest: ${web3 || "open to it"}
- Ideal role: ${idealRole || "not specified"}

Convert these into a JSON array. Each job object must have exactly these fields:
{
  "id": "unique short string like job1, job2 etc",
  "title": "job title",
  "company": "company name",
  "location": "city/country or Remote",
  "remote": true or false,
  "salary": "salary range as string or null",
  "scope": "2-3 sentence summary of the role",
  "tags": ["skill1", "skill2", "skill3"],
  "matchScore": number 0-100 based on how well it matches the candidate,
  "matchReason": "one sentence why this matches",
  "source": "job board name",
  "url": "job URL if found, else job board URL",
  "postedDate": "date posted or Recent"
}

Return ONLY the JSON array. No explanation, no markdown fences.`;

      const formatted = await callClaude(
        [{ role: "user", content: formatPrompt }],
        "You convert job search results into clean JSON arrays. Return ONLY valid JSON array, nothing else.",
        false,
        3000
      );

      const clean = formatted.replace(/```json|```/g, "").trim();
      const startIdx = clean.indexOf("[");
      const endIdx = clean.lastIndexOf("]");

      if (startIdx === -1 || endIdx === -1) {
        setSearchStep("Could not parse results. Please try again.");
        setTimeout(() => setSearching(false), 2500);
        return;
      }

      const jobs = JSON.parse(clean.slice(startIdx, endIdx + 1));

      if (!jobs || jobs.length === 0) {
        setSearchStep("Search returned no matching jobs. Try again shortly.");
        setTimeout(() => setSearching(false), 2500);
        return;
      }

      const digest = { date: todayKey, jobs: jobs.map(j => sanitizeJob({ ...j, action: null })) };
      const newDigests = { ...digests, [todayKey]: digest };
      setDigests(newDigests);
      setActiveDigest(todayKey);
      await store.set("digests", newDigests);

    } catch (e) {
      console.error("Search error:", e);
      setSearchStep("Something went wrong. Please try again.");
      setTimeout(() => setSearching(false), 2500);
      return;
    }
    setSearching(false);
    setSearchStep("");
  }

  async function handleAction(jobId, action) {
    if (!activeDigest) return;
    const updated = {
      ...digests,
      [activeDigest]: {
        ...digests[activeDigest],
        jobs: digests[activeDigest].jobs.map(j => j.id === jobId ? { ...j, action } : j),
      },
    };
    setDigests(updated);
    await store.set("digests", updated);

    if (action === "interested") {
      const job = digests[activeDigest].jobs.find(j => j.id === jobId);
      if (job) onSendToTracker(job);
    }
  }

  const currentJobs = activeDigest ? (digests[activeDigest]?.jobs || []) : [];
  const filtered = filter === "all" ? currentJobs
    : filter === "interested" ? currentJobs.filter(j => j.action === "interested")
    : filter === "saved" ? currentJobs.filter(j => j.action === "saved")
    : filter === "web3" ? currentJobs.filter(j => (j.tags || []).some(t => /web3|crypto|blockchain|defi|nft/i.test(t)) || /web3|crypto|blockchain|defi/i.test(j.title))
    : currentJobs.filter(j => j.remote);

  const digestDates = Object.keys(digests).sort().reverse();
  const interestedCount = currentJobs.filter(j => j.action === "interested").length;

  return (
    <div>
      <div className="page-header">
        <div className="page-tag">Phase 2</div>
        <div className="page-title">Daily Job Digest</div>
        <div className="page-sub">AI-powered job discovery across global boards. Web3-ready. Review and pick your targets.</div>
      </div>

      {!canSearch && (
        <div className="notif">✦ Complete your CV upload and talent mapping interview to unlock job search.</div>
      )}

      {canSearch && (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Main area */}
          <div style={{ flex: 1 }}>
            {!searching && !alreadyRanToday && currentJobs.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "48px 32px", marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Ready to search</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.7 }}>
                  Claude will search across LinkedIn, Indeed, RemoteOK, Crypto.jobs,<br />Web3.career and more — matched to your profile.
                </div>
                <button className="btn btn-primary" style={{ fontSize: 13, padding: "12px 28px" }} onClick={runSearch}>
                  Run Today's Search →
                </button>
              </div>
            )}

            {alreadyRanToday && !searching && (
              <div className="notif notif-green">
                ✦ Today's digest loaded — {currentJobs.length} jobs found · {interestedCount} marked interested
                <button className="btn btn-ghost" style={{ marginLeft: "auto", fontSize: 11 }} onClick={runSearch}>Refresh</button>
              </div>
            )}

            {searching && (
              <div className="search-progress" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: C.accent }}>{searchStep}</div>
                <div className="progress-track"><div className="progress-fill" /></div>
                <div style={{ fontSize: 11, color: C.muted }}>{searchStep.includes("Formatting") ? "Structuring results into your digest..." : "Scanning job boards globally including Web3 — this may take 20-30 seconds..."}</div>
              </div>
            )}

            {currentJobs.length > 0 && !searching && (
              <>
                <div className="filter-bar">
                  {[
                    { id: "all", label: `All (${currentJobs.length})` },
                    { id: "web3", label: "Web3 / Crypto" },
                    { id: "remote", label: "Remote" },
                    { id: "interested", label: `Interested (${currentJobs.filter(j => j.action === "interested").length})` },
                    { id: "saved", label: "Saved" },
                  ].map(f => (
                    <button key={f.id} className={`filter-btn ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>{f.label}</button>
                  ))}
                </div>

                <div className="job-grid">
                  {filtered.length === 0 ? (
                    <div className="empty-state"><div className="empty-hint">No jobs in this filter.</div></div>
                  ) : (
                    filtered.map(job => <JobCard key={job.id} job={job} onAction={handleAction} />)
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar: history */}
          {digestDates.length > 0 && (
            <div style={{ width: 200, flexShrink: 0 }}>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Digest History</div>
                {digestDates.map(d => (
                  <div key={d} className="history-item" style={{ borderRadius: 8, background: activeDigest === d ? C.surfaceHigh : "transparent" }}
                    onClick={() => setActiveDigest(d)}>
                    <div>
                      <div className="history-date">{fmtDate(d)}</div>
                      <div className="history-count">{digests[d]?.jobs?.length || 0} jobs</div>
                    </div>
                    {d === todayKey && <span className="pill pill-blue" style={{ fontSize: 8, marginLeft: "auto" }}>Today</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tracker ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"];

// ── Phase 3: Applications ────────────────────────────────────────────────────

const RESUME_SYSTEM = `You are an expert career coach and resume writer. Given a candidate's profile and a specific job, produce tailored resume edit suggestions.

Return ONLY valid JSON (no markdown) with this structure:
{
  "toneNote": "one sentence on tone/style Claude chose for this application and why",
  "edits": [
    {
      "section": "Summary|Skills|Experience|Education",
      "what": "brief description of what to change",
      "why": "why this helps for this specific role",
      "before": "original text or null if adding new",
      "after": "suggested replacement text"
    }
  ]
}

Produce 6-10 targeted, specific edits. Focus on: keyword alignment with the job description, ATS optimisation, reordering to lead with most relevant experience, quantifying achievements, and adjusting the summary to speak directly to this role.`;

const COVER_SYSTEM = `You are an expert cover letter writer. Write a compelling, personalized cover letter for this candidate applying to this role.

Decide the tone yourself based on the company and role — use a modern conversational tone for startups/Web3/creative roles, and a more polished professional tone for corporate/finance/enterprise roles. Never sound generic.

Return ONLY the cover letter text. No subject line, no JSON, no explanation. Just the letter starting from the greeting.`;

function Applications({ applications, cvProfile, talentProfile, onMarkApplied }) {
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("resume");
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [genError, setGenError] = useState("");
  const [docs, setDocs] = useState({});
  const [copied, setCopied] = useState("");

  const interested = applications.filter(a => a.status === "Applied" || a.status === "Interview");
  const selected = interested.find(a => a.id === selectedId) || interested[0];

  useEffect(() => {
    (async () => {
      const saved = await store.get("app_docs");
      if (saved) setDocs(saved);
    })();
  }, []);

  // Keep selectedId in sync when applications change
  useEffect(() => {
    if (interested.length > 0 && !selectedId) {
      setSelectedId(interested[0].id);
    }
  }, [applications]);

  async function generate(job) {
    setGenerating(true);
    setGenError("");
    setTab("resume");

    const jobContext = `Job Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nScope: ${job.scope}\nTags: ${(job.tags || []).join(", ")}\nSalary: ${job.salary || "not stated"}`;
    const candidateContext = `CV Profile: ${JSON.stringify(cvProfile)}\nTalent Profile: ${JSON.stringify(talentProfile)}`;

    try {
      setGenStep("Analysing job requirements...");
      await new Promise(r => setTimeout(r, 400));

      setGenStep("Generating resume edit suggestions...");
      const resumeReply = await callClaude([{
        role: "user",
        content: `${candidateContext}\n\n${jobContext}\n\nGenerate resume edit suggestions for this application.`
      }], RESUME_SYSTEM, false, 3000);

      const resumeClean = resumeReply.replace(/```json|```/g, "").trim();
      const resumeStart = resumeClean.indexOf("{");
      const resumeEnd = resumeClean.lastIndexOf("}");
      if (resumeStart === -1 || resumeEnd === -1) throw new Error("Resume JSON not found in response");
      const resumeData = JSON.parse(resumeClean.slice(resumeStart, resumeEnd + 1));

      setGenStep("Writing cover letter...");
      const coverReply = await callClaude([{
        role: "user",
        content: `${candidateContext}\n\n${jobContext}\n\nWrite a cover letter for this application.`
      }], COVER_SYSTEM, false, 2000);

      if (!coverReply || coverReply.length < 50) throw new Error("Cover letter generation failed");

      const newDocs = { ...docs, [job.id]: { resumeData, coverLetter: coverReply, generatedAt: new Date().toISOString() } };
      setDocs(newDocs);
      await store.set("app_docs", newDocs);

    } catch (e) {
      console.error("Generation error:", e);
      setGenError("Something went wrong: " + e.message + ". Please try regenerating.");
      setGenerating(false);
      setGenStep("");
      return;
    }
    setGenerating(false);
    setGenStep("");
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    });
  }

  const jobDocs = selected ? docs[selected.id] : null;

  return (
    <div>
      <div className="page-header">
        <div className="page-tag">Phase 3</div>
        <div className="page-title">Applications</div>
        <div className="page-sub">Generate tailored resume edits and cover letters for each job you're interested in.</div>
      </div>

      {interested.length === 0 ? (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-label">No interested jobs yet</div>
            <div className="empty-hint">Mark jobs as Interested in the Daily Digest — they'll appear here for document generation.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "flex-start" }}>

          {/* Left: Job Queue */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>
              {interested.length} job{interested.length !== 1 ? "s" : ""} to prep
            </div>
            <div className="app-queue">
              {interested.map(job => {
                const hasDocs = !!docs[job.id];
                return (
                  <div key={job.id}
                    className={`app-queue-card ${selected?.id === job.id ? "active" : ""}`}
                    onClick={() => setSelectedId(job.id)}>
                    <div style={{ fontSize: 22 }}>{companyEmoji(job.company)}</div>
                    <div className="app-queue-info">
                      <div className="app-queue-title">{job.title}</div>
                      <div className="app-queue-meta">{job.company} · {job.location}</div>
                    </div>
                    <div>
                      {hasDocs
                        ? <span className="pill pill-green" style={{ fontSize: 9 }}>✓ Ready</span>
                        : <span className="pill pill-gray" style={{ fontSize: 9 }}>Pending</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Doc Panel */}
          {selected && (
            <div>
              {/* Job header */}
              <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 28 }}>{companyEmoji(selected.company)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18 }}>{selected.title}</div>
                  <div style={{ color: C.accent, fontSize: 12 }}>{selected.company} · {selected.location}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{selected.scope}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  {selected.salary && <span style={{ color: C.gold, fontSize: 12 }}>💰 {selected.salary}</span>}
                  <a href={selected.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: C.accent, textDecoration: "none" }}>View Job →</a>
                </div>
              </div>

              {/* Generate or show docs */}
              {!jobDocs && !generating && (
                <div className="card" style={{ textAlign: "center", padding: "40px 28px" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Ready to generate your docs</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
                    Claude will analyse this role against your full profile and produce targeted resume edits + a personalised cover letter.
                  </div>
                  {genError && (
                    <div style={{ background: "rgba(255,77,109,.08)", border: "1px solid rgba(255,77,109,.2)", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: C.danger, marginBottom: 16, textAlign: "left" }}>
                      ⚠ {genError}
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ padding: "12px 28px" }}
                    onClick={() => generate(selected)}>
                    Generate Application Docs →
                  </button>
                </div>
              )}

              {generating && (
                <div className="gen-progress">
                  <div style={{ fontSize: 13, color: C.accent, marginBottom: 16 }}>{genStep}</div>
                  <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: `linear-gradient(90deg,${C.accent},${C.success})`, borderRadius: 2, animation: "progressAnim 2s ease infinite" }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 12 }}>Matching your profile to the job description...</div>
                </div>
              )}

              {jobDocs && !generating && (
                <div className="doc-panel">
                  {/* Tone note */}
                  {jobDocs.resumeData?.toneNote && (
                    <div className="notif" style={{ marginBottom: 16 }}>
                      ✦ {jobDocs.resumeData.toneNote}
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="doc-tabs">
                    <div className={`doc-tab ${tab === "resume" ? "active" : ""}`} onClick={() => setTab("resume")}>
                      Resume Edits ({jobDocs.resumeData?.edits?.length || 0})
                    </div>
                    <div className={`doc-tab ${tab === "cover" ? "active" : ""}`} onClick={() => setTab("cover")}>
                      Cover Letter
                    </div>
                  </div>

                  {/* Resume Edits Tab */}
                  {tab === "resume" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: C.muted }}>Apply these changes to your CV before submitting.</div>
                        <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 10 }}
                          onClick={() => {
                            const text = (jobDocs.resumeData?.edits || []).map(e =>
                              `[${e.section}] ${e.what}\n→ WHY: ${e.why}${e.before ? `\n→ BEFORE: ${e.before}` : ""}\n→ AFTER: ${e.after}`
                            ).join("\n\n");
                            copyText(text, "edits");
                          }}>
                          {copied === "edits" ? "✓ Copied" : "Copy All Edits"}
                        </button>
                      </div>
                      {(jobDocs.resumeData?.edits || []).map((edit, i) => (
                        <div key={i} className="edit-item">
                          <div className="edit-section-label">{edit.section}</div>
                          <div className="edit-what">{edit.what}</div>
                          <div className="edit-why">💡 {edit.why}</div>
                          {edit.before && <div className="edit-before">✕ {edit.before}</div>}
                          <div className="edit-after">✓ {edit.after}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cover Letter Tab */}
                  {tab === "cover" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: C.muted }}>Review, personalise if needed, then copy to submit.</div>
                        <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 10 }}
                          onClick={() => copyText(jobDocs.coverLetter, "cover")}>
                          {copied === "cover" ? "✓ Copied" : "Copy Letter"}
                        </button>
                      </div>
                      <div className="cover-letter">{jobDocs.coverLetter}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="divider" />
                  <div className="flex-row">
                    <button className="btn btn-success" onClick={() => onMarkApplied(selected.id)}>
                      ✓ Mark as Applied
                    </button>
                    <button className="btn btn-ghost" onClick={() => generate(selected)}>
                      Regenerate
                    </button>
                    <div style={{ marginLeft: "auto", fontSize: 11, color: C.muted }}>
                      Generated {new Date(jobDocs.generatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Tracker ──────────────────────────────────────────────────────────────────
function Tracker({ applications, onUpdate }) {
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState("tsv");
  const [copied, setCopied] = useState(false);

  function updateField(id, field, val) {
    onUpdate(applications.map(a => a.id === id ? { ...a, [field]: val } : a));
  }

  const counts = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: applications.filter(a => a.status === s).length }), {});

  const HEADERS = ["Company", "Role", "Location", "Salary", "Scope", "Date Added", "Status", "Follow-up", "Job URL"];

  function buildExportData(format) {
    const sep = format === "tsv" ? "\t" : ",";
    const wrap = format === "csv" ? (v) => '"' + String(v || "").replace(/"/g, '""') + '"' : (v) => String(v || "");
    const rows = [
      HEADERS.map(wrap).join(sep),
      ...applications.map(a => [
        a.company,
        a.role || a.title,
        a.location + (a.remote ? " (Remote)" : ""),
        a.salary || "",
        (a.scope || "").slice(0, 200),
        fmtDate(a.addedDate || a.appliedDate || today()),
        a.status || "Applied",
        a.followUp || "",
        a.url || "",
      ].map(wrap).join(sep))
    ];
    return rows.join("\n");
  }

  function handleCopy() {
    const data = buildExportData(exportFormat);
    navigator.clipboard.writeText(data).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-tag">Dashboard</div>
        <div className="page-title">Application Tracker</div>
        <div className="page-sub">Track every application. Update status as you progress.</div>
      </div>

      {applications.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap", alignItems: "center" }}>
            {[["Applied","pill-blue"],["Interview","pill-gold"],["Offer","pill-green"],["Rejected","pill-red"]].map(([s,p]) => (
              <div key={s} className="card" style={{ padding: "14px 20px", display: "flex", gap: 10, alignItems: "center", flex: "0 0 auto" }}>
                <span className={"pill " + p}>{s}</span>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 20 }}>{counts[s] || 0}</span>
              </div>
            ))}
            <button className="btn btn-gold" style={{ marginLeft: "auto" }} onClick={() => setShowExport(!showExport)}>
              📊 Export to Sheets
            </button>
          </div>

          {showExport && (
            <div className="card" style={{ marginBottom: 24, borderColor: C.gold }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                Export to Google Sheets
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
                Choose your format, copy the data, then paste into Google Sheets.
              </div>

              <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
                <div className="two-col" style={{ flex: 1, gap: 12 }}>
                  {[
                    { id: "tsv", label: "TSV — Paste directly", desc: "Open Google Sheets → click cell A1 → Ctrl+V (or Cmd+V). Columns auto-populate." },
                    { id: "csv", label: "CSV — File import", desc: "Paste into a .txt file → rename to .csv → use File > Import in Google Sheets." },
                  ].map(f => (
                    <div key={f.id}
                      onClick={() => setExportFormat(f.id)}
                      style={{ background: exportFormat === f.id ? "rgba(240,165,0,.08)" : C.surfaceHigh, border: "1px solid " + (exportFormat === f.id ? C.gold : C.border), borderRadius: 10, padding: 16, cursor: "pointer", transition: "all .2s" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: exportFormat === f.id ? C.gold : C.text, marginBottom: 4 }}>
                        {exportFormat === f.id ? "✓ " : ""}{f.label}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: C.surfaceHigh, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>
                  Preview — {applications.length} row{applications.length !== 1 ? "s" : ""} + header
                </div>
                <div style={{ fontSize: 11, color: C.accent, fontFamily: "'DM Mono',monospace", lineHeight: 1.8 }}>
                  {HEADERS.join(exportFormat === "tsv" ? "  |  " : ",  ")}<br />
                  <span style={{ color: C.muted }}>
                    {applications.slice(0,2).map(a =>
                      [a.company, a.role || a.title, a.location, a.status].join(exportFormat === "tsv" ? "  |  " : ",  ")
                    ).join("\n")}
                    {applications.length > 2 ? "\n... and " + (applications.length - 2) + " more rows" : ""}
                  </span>
                </div>
              </div>

              <div style={{ background: "rgba(240,165,0,.06)", border: "1px solid rgba(240,165,0,.2)", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: C.gold, fontWeight: 600, marginBottom: 6 }}>
                  📋 How to paste into Google Sheets (TSV)
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                  1. Click the button below to copy your data<br />
                  2. Open <a href="https://sheets.google.com" target="_blank" rel="noreferrer" style={{ color: C.accent }}>sheets.google.com</a> and create a new sheet<br />
                  3. Click cell <strong style={{ color: C.text }}>A1</strong><br />
                  4. Press <strong style={{ color: C.text }}>Ctrl+V</strong> (Windows) or <strong style={{ color: C.text }}>Cmd+V</strong> (Mac)<br />
                  5. Your data lands in the correct columns automatically ✓
                </div>
              </div>

              <div className="flex-row">
                <button className="btn btn-gold" onClick={handleCopy} style={{ fontSize: 13, padding: "11px 24px" }}>
                  {copied ? "✓ Copied! Now paste into Sheets" : "Copy " + exportFormat.toUpperCase() + " Data"}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowExport(false)}>Close</button>
                <div style={{ marginLeft: "auto", fontSize: 11, color: C.muted }}>
                  {applications.length} application{applications.length !== 1 ? "s" : ""} · {HEADERS.length} columns
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="card">
        {applications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-label">No applications yet</div>
            <div className="empty-hint">Mark jobs as Interested in the Daily Digest — they'll appear here automatically.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th><th>Role</th><th>Location</th><th>Salary</th>
                  <th>Scope</th><th>Added</th><th>Status</th><th>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.company}</td>
                    <td><a href={a.url} target="_blank" rel="noreferrer" style={{ color: C.accent, textDecoration: "none" }}>{a.role || a.title}</a></td>
                    <td style={{ color: C.muted }}>{a.location} {a.remote && <span className="pill pill-green" style={{ fontSize: 9, marginLeft: 4 }}>Remote</span>}</td>
                    <td style={{ color: C.gold }}>{a.salary || "—"}</td>
                    <td style={{ color: C.muted, maxWidth: 180, fontSize: 11 }}>{(a.scope || "").slice(0,80)}{(a.scope||"").length > 80 ? "…" : ""}</td>
                    <td style={{ color: C.muted }}>{fmtDate(a.addedDate || a.appliedDate || today())}</td>
                    <td>
                      <select value={a.status || "Applied"} onChange={e => updateField(a.id, "status", e.target.value)}
                        style={{ background: C.surfaceHigh, border: "1px solid " + C.border, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer" }}>
                        {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="date" value={a.followUp || ""} onChange={e => updateField(a.id, "followUp", e.target.value)}
                        style={{ background: C.surfaceHigh, border: "1px solid " + C.border, color: a.followUp ? C.gold : C.muted, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontFamily: "'DM Mono',monospace" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [cvProfile, setCvProfile] = useState(null);
  const [talentProfile, setTalentProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [newApps, setNewApps] = useState(0);

  useEffect(() => {
    (async () => {
      const cv = await store.get("cv_profile");
      const talent = await store.get("talent_profile");
      const apps = await store.get("applications");
      if (cv) setCvProfile(cv);
      if (talent) setTalentProfile(sanitizeTalentProfile(talent));
      if (apps) setApplications(apps);
      setLoaded(true);
    })();
  }, []);

  async function saveApplications(apps) {
    setApplications(apps);
    await store.set("applications", apps);
  }

  const [showExport, setShowExport] = useState(false);
  const [exportJson, setExportJson] = useState("");
  const [exportCopied, setExportCopied] = useState(false);

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: "jobpilot-phase2",
      cv_profile: cvProfile,
      talent_profile: talentProfile,
    };
    setExportJson(JSON.stringify(payload, null, 2));
    setShowExport(true);
  }

  async function handleImport(file) {
    try {
      const text = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.onerror = rej;
        r.readAsText(file);
      });
      const data = JSON.parse(text);
      if (data.cv_profile) {
        setCvProfile(data.cv_profile);
        await store.set("cv_profile", data.cv_profile);
      }
      if (data.talent_profile) {
        setTalentProfile(data.talent_profile);
        await store.set("talent_profile", data.talent_profile);
      }
      setScreen("welcome");
    } catch {
      alert("Could not read profile file. Make sure it's a valid jobpilot-profile.json.");
    }
  }

  async function handleImportText(text) {
    try {
      const data = JSON.parse(text);
      if (!data.cv_profile && !data.talent_profile) return "Invalid profile data — make sure you copied the full JSON.";
      if (data.cv_profile) { setCvProfile(data.cv_profile); await store.set("cv_profile", data.cv_profile); }
      if (data.talent_profile) {
        const t = sanitizeTalentProfile(data.talent_profile);
        setTalentProfile(t);
        await store.set("talent_profile", t);
      }
      setScreen("welcome");
      return null;
    } catch {
      return "Could not parse JSON — make sure you copied the full text from the export modal.";
    }
  }

  function handleMarkApplied(jobId) {
    const updated = applications.map(a => a.id === jobId ? { ...a, status: "Applied", appliedDate: today() } : a);
    saveApplications(updated);
    setScreen("tracker");
  }

  function handleSendToTracker(job) {
    const exists = applications.some(a => a.id === job.id);
    if (exists) return;
    const newApp = { ...job, role: job.title, status: "Applied", addedDate: today(), followUp: "" };
    const updated = [...applications, newApp];
    saveApplications(updated);
    setNewApps(n => n + 1);
    setTimeout(() => setNewApps(0), 3000);
  }

  const pendingDocs = applications.filter(a => a.status === "Applied").length;

  const NAV = [
    { section: "Setup" },
    { id: "welcome", label: "Home" },
    { id: "cv", label: "CV Profile", done: !!cvProfile },
    { id: "talent", label: "Talent Map", done: !!talentProfile, locked: !cvProfile },
    { id: "profile", label: "My Profile", done: !!talentProfile },
    { section: "Job Search" },
    { id: "digest", label: "Daily Digest", locked: !(cvProfile && talentProfile) },
    { id: "applications", label: "Applications", badge: pendingDocs > 0 ? String(pendingDocs) : null, locked: !(cvProfile && talentProfile) },
    { id: "tracker", label: "Tracker", badge: newApps > 0 ? ("+" + newApps) : null },
  ];

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: C.accent, fontFamily: "'DM Mono',monospace" }}>
      Loading <span className="dots" style={{ marginLeft: 6 }}><span>.</span><span>.</span><span>.</span></span>
    </div>
  );

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="sidebar">
          <div className="sidebar-logo">JOBPILOT<span>AI · Career Assistant</span></div>
          {NAV.map((n, i) =>
            n.section ? (
              <div key={i} className="nav-section">{n.section}</div>
            ) : (
              <div key={n.id}
                className={`nav-item ${screen === n.id ? "active" : ""}`}
                style={{ opacity: n.locked ? 0.35 : 1, cursor: n.locked ? "not-allowed" : "pointer" }}
                onClick={() => !n.locked && setScreen(n.id)}>
                <div className="nav-dot" style={{ background: n.done ? C.success : "currentColor" }} />
                {n.label}
                {n.badge && <span className="nav-badge">{n.badge}</span>}
              </div>
            )
          )}
        </nav>

        <main className="main">
          {screen === "welcome" && <Welcome hasCV={!!cvProfile} hasTalent={!!talentProfile} onStart={s => setScreen(s)} onExport={handleExport} onImportText={handleImportText} />}
          {screen === "cv" && <CVUpload existing={cvProfile} onDone={p => { setCvProfile(p); setScreen("talent"); }} />}
          {screen === "talent" && <TalentInterview cvProfile={cvProfile} existing={talentProfile} onDone={t => { setTalentProfile(sanitizeTalentProfile(t)); setScreen("profile"); }} />}
          {screen === "profile" && <TalentProfile profile={talentProfile} cvProfile={cvProfile} onEdit={() => setScreen("talent")} />}
          {screen === "digest" && <Digest cvProfile={cvProfile} talentProfile={talentProfile} onSendToTracker={handleSendToTracker} />}
          {screen === "applications" && <Applications applications={applications} cvProfile={cvProfile} talentProfile={talentProfile} onMarkApplied={handleMarkApplied} />}
          {screen === "tracker" && <Tracker applications={applications} onUpdate={saveApplications} />}
        </main>
      </div>

      {newApps > 0 && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: C.success, color: C.bg, padding: "12px 20px", borderRadius: 10, fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 600, animation: "fadeUp .3s ease", zIndex: 999 }}>
          ✓ Added to Tracker
        </div>
      )}

      {showExport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 28, maxWidth: 600, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Export Profile</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.7 }}>
              Copy all text below → paste into a new text file → save as <code style={{ color: C.accent }}>jobpilot-profile.json</code>
            </div>
            <textarea readOnly value={exportJson}
              style={{ flex: 1, background: C.surfaceHigh, border: "1px solid " + C.border, borderRadius: 8, padding: 14, color: C.text, fontFamily: "'DM Mono',monospace", fontSize: 11, resize: "none", outline: "none", minHeight: 280 }}
              onClick={e => e.target.select()} />
            <div className="flex-row" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => {
                navigator.clipboard.writeText(exportJson).then(() => { setExportCopied(true); setTimeout(() => setExportCopied(false), 2000); });
              }}>{exportCopied ? "✓ Copied!" : "Copy to Clipboard"}</button>
              <button className="btn btn-ghost" onClick={() => setShowExport(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}