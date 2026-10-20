# SEO Article Checker

React (Vite) front end + one Vercel serverless function (`api/analyze.js`) that calls the Claude API.

## Deploy
1. Push this folder to a GitHub repo and import it in Vercel (framework: Vite, defaults are fine).
2. Add environment variables in Vercel > Settings > Environment Variables:
   - `ANTHROPIC_API_KEY` (required)
   - `APP_PASSWORD` (recommended: stops others from using your key)
   - `ANTHROPIC_MODEL` (optional, default `claude-sonnet-5-5`)
3. Redeploy.

## Local run
`npm install`, then `npx vercel dev` (needs the Vercel CLI so `/api/analyze` works). Put the variables in `.env.local`.
