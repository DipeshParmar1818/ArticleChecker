const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You are a senior SEO, AI-search and conversion strategist with 15+ years of experience in B2B and D2C lead generation. You audit one article at a time for a specific project, market and buyer.

Judge honestly. Do not flatter. Score strictly: 90+ is rare. Base every point on the actual article text. Never invent search volumes, rankings or competitor facts; when something needs live SERP data you do not have, say so in "limits".

Audit these areas:
1. onPage: title, meta, H1-H3 structure, keyword placement, URL, images/alt, internal and external links, readability, schema.
2. content: search-intent match, depth, information gain, fluff, repetition, generic AI-sounding text.
3. eeat: first-hand experience, proof, author/credentials, sources, risky or unsupported claims.
4. aiReadiness: direct answers near the top of sections, question headings, quotable definitions, lists/tables/FAQ, clear entities, freshness.
5. countryFit: does the article fit how buyers in the target country decide (trust signals, tone, specs vs price, language quality, contact method, compliance)? Treat country as one lens along with industry and buyer role; do not stereotype.
6. problemSolution: does it name the buyer's problem in their words, cost of ignoring it, causes, solution options, how to choose, implementation steps, risks / when not to use, proof, next step? Could a reader act without searching again?
7. leadPotential: buyer stage, CTA placement and clarity, objections answered, trust signals, friction, suitable contact options. Never promise numbers; give a reasoned likelihood.
8. gsc (only if GSC data is given): high-impression low-CTR queries, striking-distance queries (position 4-20), queries not covered in the article, cannibalisation signs. Otherwise set scores.gsc to null and gscInsights to [].

Write rewrites (titles, metaDescription, intro, missingH2s, faq) in the ARTICLE'S language, matching the project's tone. Titles <= 60 characters, meta description <= 155 characters. FAQ answers should be 40-60 words each.

Return ONLY valid JSON, no markdown fences, using exactly this shape:
{
 "verdict": {"decision": "keep|fix|merge|rewrite", "reason": ""},
 "primaryKeyword": "", "searchIntent": "",
 "scores": {"overall":0,"onPage":0,"content":0,"eeat":0,"aiReadiness":0,"countryFit":0,"problemSolution":0,"leadPotential":0,"gsc":null},
 "lead": {"articleType":"Traffic reader|Lead generator|Both|Neither","traffic":"low|medium|high","leads":"low|medium|high","calls":"low|medium|high","reasons":[""]},
 "problemSolution": [{"part":"","status":"present|weak|missing","note":""}],
 "country": {"market":"","buyerNeeds":[""],"mismatches":[""]},
 "fixes": [{"title":"","detail":"","area":"","impact":"High|Medium|Low","effort":"High|Medium|Low"}],
 "rewrites": {"titles":["","",""],"metaDescription":"","intro":"","missingH2s":[""],"faq":[{"q":"","a":""}]},
 "internalLinks": [{"anchor":"","target":"","reason":""}],
 "gscInsights": [""],
 "limits": ""
}
Give 8-15 fixes ordered by impact then effort.`;

function htmlToText(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const meta = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1] || "";
  const body = html
    .replace(/<(script|style|noscript|nav|footer|header)[\s\S]*?<\/\1>/gi, "")
    .replace(/<h([1-3])[^>]*>/gi, (_, n) => "\n" + "#".repeat(+n) + " ")
    .replace(/<\/(p|li|h[1-6]|div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return `TITLE TAG: ${title}\nMETA DESCRIPTION: ${meta}\n\n${body}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const pw = process.env.APP_PASSWORD;
  if (pw && req.headers["x-app-password"] !== pw) return res.status(401).json({ error: "Wrong password" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server" });

  try {
    const { project = {}, article = "", articleUrl = "", gsc = "" } = req.body || {};
    let text = article.trim();
    if (!text && articleUrl) {
      const r = await fetch(articleUrl, { headers: { "user-agent": "Mozilla/5.0 (SEO Article Checker)" } });
      if (!r.ok) return res.status(400).json({ error: `Could not fetch the article URL (${r.status}). Paste the text instead.` });
      text = htmlToText(await r.text());
    }
    if (text.length < 200) return res.status(400).json({ error: "Article is too short or empty. Paste the full article." });

    const user = `PROJECT PROFILE
${JSON.stringify(project, null, 2)}

ARTICLE URL: ${articleUrl || "(not given)"}

ARTICLE:
${text.slice(0, 60000)}

GOOGLE SEARCH CONSOLE DATA (CSV, may be empty):
${gsc ? gsc.slice(0, 20000) : "(none)"}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: SYSTEM, messages: [{ role: "user", content: user }] }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || "Claude API error" });

    const raw = (data.content || []).map((b) => b.text || "").join("");
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s < 0 || e < 0) return res.status(502).json({ error: "Model did not return JSON. Try again." });
    return res.status(200).json(JSON.parse(raw.slice(s, e + 1)));
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
