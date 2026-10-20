import { useState, useEffect } from "react";

const EMPTY = { name: "", website: "", country: "India", language: "English", industry: "", buyer: "", usp: "", tone: "", goal: "Leads (calls and forms)" };
const COUNTRIES = ["India", "Germany", "France", "USA", "UK", "UAE", "Other"];
const GOALS = ["Leads (calls and forms)", "Online sales", "Traffic and brand", "Quote requests"];
const TABS = ["Overview", "Fixes", "Rewrites", "Country and leads", "Problem and solution"];
const AREAS = [["onPage", "On-page"], ["content", "Content"], ["eeat", "E-E-A-T"], ["aiReadiness", "AI readiness"], ["countryFit", "Country fit"], ["problemSolution", "Problem and solution"], ["leadPotential", "Lead potential"], ["gsc", "GSC opportunity"]];

const loadProjects = () => { try { return JSON.parse(localStorage.getItem("seo_projects") || "[]"); } catch { return []; } };
const tone = (n) => (n >= 75 ? "good" : n >= 50 ? "mid" : "bad");

function Copy({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return <button className="ghost" onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : label}</button>;
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export default function App() {
  const [projects, setProjects] = useState(loadProjects);
  const [p, setP] = useState(projects[0] || EMPTY);
  const [article, setArticle] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [gsc, setGsc] = useState("");
  const [gscName, setGscName] = useState("");
  const [password, setPassword] = useState(() => localStorage.getItem("seo_pw") || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [r, setR] = useState(null);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState("All");

  useEffect(() => { localStorage.setItem("seo_projects", JSON.stringify(projects)); }, [projects]);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  const saveProject = () => {
    if (!p.name.trim()) return setError("Give the project a name before saving.");
    setError("");
    setProjects([...projects.filter((x) => x.name !== p.name), p]);
  };
  const removeProject = () => { setProjects(projects.filter((x) => x.name !== p.name)); setP(EMPTY); };

  const onGsc = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const t = await f.text();
    setGsc(t.split("\n").slice(0, 300).join("\n"));
    setGscName(f.name);
  };

  const run = async () => {
    setError(""); setR(null);
    if (!article.trim() && !articleUrl.trim()) return setError("Paste the article text or enter the article URL.");
    setBusy(true);
    localStorage.setItem("seo_pw", password);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", "x-app-password": password },
        body: JSON.stringify({ project: p, article, articleUrl, gsc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setR(data); setTab(0);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const schema = r?.rewrites?.faq?.length
    ? JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: r.rewrites.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }, null, 2)
    : "";

  const fixes = (r?.fixes || []).filter((f) => filter === "All" || f.impact === filter);

  return (
    <div className="app">
      <header>
        <h1>SEO Article Checker</h1>
        <p>Audit one article against its project, market and buyer.</p>
      </header>

      <div className="layout">
        <section className="panel">
          <h2>Project</h2>
          <Field label="Saved projects">
            <select value={projects.find((x) => x.name === p.name) ? p.name : ""} onChange={(e) => setP(projects.find((x) => x.name === e.target.value) || EMPTY)}>
              <option value="">New project</option>
              {projects.map((x) => <option key={x.name}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Project name"><input value={p.name} onChange={set("name")} placeholder="e.g. Häberle Lab" /></Field>
          <Field label="Website"><input value={p.website} onChange={set("website")} placeholder="https://" /></Field>
          <div className="row">
            <Field label="Target country"><select value={p.country} onChange={set("country")}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Article language"><input value={p.language} onChange={set("language")} /></Field>
          </div>
          <Field label="Industry and product"><input value={p.industry} onChange={set("industry")} placeholder="e.g. screw air compressors" /></Field>
          <Field label="Buyer (role, what they worry about)"><textarea rows={2} value={p.buyer} onChange={set("buyer")} placeholder="e.g. factory owner, cares about running cost and service" /></Field>
          <Field label="USP and proof you can claim"><textarea rows={2} value={p.usp} onChange={set("usp")} /></Field>
          <Field label="Brand tone"><input value={p.tone} onChange={set("tone")} placeholder="e.g. technical, plain, no hype" /></Field>
          <Field label="Main goal"><select value={p.goal} onChange={set("goal")}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <div className="row">
            <button className="ghost" onClick={saveProject}>Save project</button>
            {projects.find((x) => x.name === p.name) && <button className="ghost danger" onClick={removeProject}>Delete</button>}
          </div>
        </section>

        <section className="panel">
          <h2>Article</h2>
          <Field label="Article URL (used if no text is pasted)"><input value={articleUrl} onChange={(e) => setArticleUrl(e.target.value)} placeholder="https://" /></Field>
          <Field label="Article text"><textarea rows={14} value={article} onChange={(e) => setArticle(e.target.value)} placeholder="Paste the full article with its headings. Include the title and meta description at the top if you have them." /></Field>
          <Field label={`Search Console export, optional${gscName ? ` (${gscName})` : ""}`}>
            <input type="file" accept=".csv,.tsv,.txt" onChange={onGsc} />
          </Field>
          <Field label="Access password (only if you set one)"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <button className="primary" onClick={run} disabled={busy}>{busy ? "Auditing, this takes up to a minute" : "Audit article"}</button>
          {error && <p className="error">{error}</p>}
        </section>
      </div>

      {r && (
        <section className="results">
          <div className="top">
            <div className={`big ${tone(r.scores.overall)}`}>{r.scores.overall}</div>
            <div>
              <div className="verdict">Verdict: {r.verdict?.decision}</div>
              <p>{r.verdict?.reason}</p>
              <p className="muted">Primary keyword: {r.primaryKeyword} · Intent: {r.searchIntent}</p>
            </div>
          </div>

          <nav>{TABS.map((t, i) => <button key={t} className={i === tab ? "on" : ""} onClick={() => setTab(i)}>{t}</button>)}</nav>

          {tab === 0 && (
            <div className="bars">
              {AREAS.filter(([k]) => r.scores[k] != null).map(([k, l]) => (
                <div key={k} className="bar"><span>{l}</span><div><i className={tone(r.scores[k])} style={{ width: `${r.scores[k]}%` }} /></div><b>{r.scores[k]}</b></div>
              ))}
              {r.gscInsights?.length > 0 && <><h3>Search Console findings</h3><ul>{r.gscInsights.map((g, i) => <li key={i}>{g}</li>)}</ul></>}
              {r.internalLinks?.length > 0 && <><h3>Internal link suggestions</h3><ul>{r.internalLinks.map((l, i) => <li key={i}><b>{l.anchor}</b> to {l.target}. {l.reason}</li>)}</ul></>}
              {r.limits && <p className="muted">Limits: {r.limits}</p>}
            </div>
          )}

          {tab === 1 && (
            <div>
              <div className="filters">{["All", "High", "Medium", "Low"].map((f) => <button key={f} className={f === filter ? "on" : ""} onClick={() => setFilter(f)}>{f === "All" ? "All impact" : `${f} impact`}</button>)}</div>
              {fixes.map((f, i) => (
                <div key={i} className="fix">
                  <div className="tags"><span className={`tag ${f.impact}`}>{f.impact} impact</span><span className="tag">{f.effort} effort</span><span className="tag">{f.area}</span></div>
                  <h3>{f.title}</h3><p>{f.detail}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 2 && r.rewrites && (
            <div className="rw">
              <h3>Title options</h3>
              {r.rewrites.titles?.map((t, i) => <div key={i} className="item"><span>{t} <em>({t.length})</em></span><Copy text={t} /></div>)}
              <h3>Meta description</h3>
              <div className="item"><span>{r.rewrites.metaDescription} <em>({r.rewrites.metaDescription?.length})</em></span><Copy text={r.rewrites.metaDescription} /></div>
              <h3>Intro</h3>
              <div className="item"><span>{r.rewrites.intro}</span><Copy text={r.rewrites.intro} /></div>
              <h3>Missing sections (H2)</h3>
              <ul>{r.rewrites.missingH2s?.map((h, i) => <li key={i}>{h}</li>)}</ul>
              <h3>FAQ</h3>
              {r.rewrites.faq?.map((f, i) => <div key={i} className="faq"><b>{f.q}</b><p>{f.a}</p></div>)}
              {schema && <><div className="item"><h3>FAQ schema (JSON-LD)</h3><Copy text={`<script type="application/ld+json">\n${schema}\n</script>`} label="Copy script tag" /></div><pre>{schema}</pre></>}
            </div>
          )}

          {tab === 3 && (
            <div>
              <h3>Lead potential: {r.lead?.articleType}</h3>
              <p className="muted">Traffic {r.lead?.traffic} · Leads {r.lead?.leads} · Calls {r.lead?.calls}. This is a reasoned estimate, not a forecast.</p>
              <ul>{r.lead?.reasons?.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h3>What {r.country?.market} buyers need</h3>
              <ul>{r.country?.buyerNeeds?.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h3>Where the article misses</h3>
              <ul>{r.country?.mismatches?.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          {tab === 4 && (
            <div>
              {r.problemSolution?.map((x, i) => (
                <div key={i} className="ps"><span className={`dot ${x.status}`} /><div><b>{x.part}</b> <em>{x.status}</em><p>{x.note}</p></div></div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
