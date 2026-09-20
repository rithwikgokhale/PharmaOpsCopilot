# Tech stack

Who should read this: anyone asking "why this library?" or planning a production-scale replacement. Versions are the caret ranges in `package.json` / `site/package.json` as of this writing. There is no `requirements.txt`; Python scripts use the standard library only.

## Why TypeScript for the agent and Python for data

The copilot, MCP server, evals, and React UI share one type source (`app/src/types`) and one runtime (Node 20). Zod schemas, Vitest, and the MCP SDK all sit naturally in TypeScript. Python owns generation and contextualization because that work is CSV/JSON transforms, `difflib`, and timezone/unit arithmetic — the same shape as extractors and RAW transformations on CDF, and stdlib-only so CI does not install pandas. Retrieval query-time is TypeScript reading a JSON index Python wrote. Do not port the MCP server to Python; do not rewrite `contextualize.py` in TypeScript.

At production scale the TypeScript agent is replaced by Atlas AI + Industrial MCP; Python (or transformation SQL) remains the ingest path.

## Languages

| Language | Where | Why | Instead of | At scale |
|----------|-------|-----|------------|----------|
| TypeScript 5.7 (`typescript` ^5.7.2), ESM, `strict` | `app/`, `server/`, `evals/`, `site/` | One type graph, Vite + tsx | JavaScript, Python FastAPI for the API | Flows app + Atlas; types become SDK views |
| Python 3 | `scripts/*.py` | Stdlib CSV/JSON/`difflib` | pandas/pydantic | Extractors, RAW, transformation jobs |
| YAML | `cdf/**` | Toolkit + Cognite CLI agent/eval | Hand-written JSON | Same files, deployed |
| Markdown | SOPs, this folder, README | Citations + docs | Confluence-only | Atlas skill body + Pages |
| CSS / Tailwind 3.4 | `app/src/styles.css`, `tailwind.config.js` | Utility styling, `class` dark mode | CSS-in-JS, MUI | Aura on a Flows app ([Aura](https://docs.cognite.com/cdf/aura/index)) |

## Frontend (root)

| Package | Range | Used for | Why | Considered | At scale |
|---------|-------|----------|-----|------------|----------|
| `react` / `react-dom` | ^18.3.1 | UI | Ecosystem, React 18 | Vue, Svelte | Flows template is React |
| `react-router-dom` | ^6.28.0 | App routes | Simple SPA | Next.js | Flows routing / host APIs |
| `framer-motion` | ^12.42.0 | Route/nav/theme motion | Small, reduced-motion CSS override | CSS-only | Optional; Aura motion |
| `lucide-react` | ^1.22.0 | Icons | Tree-shakeable | Heroicons, Font Awesome | Aura icons |
| `recharts` | ^2.15.0 | Line charts + `ReferenceArea` | SVG, no canvas tax for this volume | visx, Plotly, uPlot | CDF Charts / Grafana |

Site reuses `react`, `react-dom`, `framer-motion`, `lucide-react` at the same ranges. No router on the site today.

## Backend

| Package | Range | Used for | Why | Considered | At scale |
|---------|-------|----------|-----|------------|----------|
| `express` | ^4.21.2 | `/api/*` | Predictable, supertest | Fastify, Hono | Flows app talks to CDF APIs directly |
| `cors` | ^2.8.5 | Dev CORS | Local Vite origin | — | Hosted app: CDF CSP |
| `dotenv` | ^17.4.2 | Load `.env` | Keys stay off the client | — | CDF secrets / `connectToHostApp` |
| `zod` | ^4.4.3 | Chat body, LLM JSON, MCP inputs | Runtime types | io-ts, yup | Keep for adapters |

`server/index.ts` is executed by `tsx` (no `tsc` emit; `tsconfig` `noEmit: true`).

## Agent / LLM

| Package | Range | Used for | Why | Considered | At scale |
|---------|-------|----------|-----|------------|----------|
| `openai` | ^6.45.0 | OpenAI chat completions | Official SDK, JSON mode | LangChain, Vercel AI SDK | Atlas hosted models |
| `fetch` (runtime) | — | Anthropic Messages + Gemini generateContent | No extra deps | Official SDKs | Atlas `azure/gpt-4.1` (exported agent `model`) |

LangChain was rejected: one chain, three thin adapters, easier evals. See [08-decisions.md](./08-decisions.md).

## MCP

| Package | Range | Used for | Why | Considered | At scale |
|---------|-------|----------|-----|------------|----------|
| `@modelcontextprotocol/sdk` | ^1.30.0 | Server + in-memory test client | Official protocol | DIY JSON-RPC | [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp) |

## Data / Python

Stdlib modules: `csv`, `json`, `difflib`, `re`, `datetime`, `pathlib`, `collections`, `argparse`, `math`, `os`, `sys`, `urllib` (optional OpenAI embeddings rebuild only). `random.seed(42)` in the generator. No pip packages.

## Testing

| Package | Range | Used for | Why | Considered | At scale |
|---------|-------|----------|-----|------------|----------|
| `vitest` | ^2.1.8 | Unit + integration | Same Vite pipeline | Jest | Keep; add Playwright if UI gates |
| `supertest` | ^7.2.2 | Express routes | In-process HTTP | light-my-request | — |
| `@types/supertest` | ^7.2.0 | Types | — | — | — |

## Tooling

| Package | Range | Used for | Why | Considered |
|---------|-------|----------|-----|------------|
| `vite` | ^6.0.3 | App + site bundler | Fast, `root: "app"`, alias `@` | webpack, Next |
| `@vitejs/plugin-react` | ^4.3.4 | JSX | Official | — |
| `tsx` | ^4.19.2 | Run/watch TypeScript | No emit step | `ts-node` |
| `typescript` | ^5.7.2 | `tsc --noEmit` | Strict | — |
| `eslint` | ^10.6.0 | Lint | Flat config | — |
| `@eslint/js` | ^10.0.1 | ESLint JS base | Official | — |
| `typescript-eslint` | ^8.62.1 | TS rules | Official | — |
| `eslint-plugin-react-hooks` | ^7.1.1 | Hooks rules | Official | — |
| `eslint-plugin-react-refresh` | ^0.5.3 | Vite refresh | Official | — |
| `globals` | ^17.7.0 | ESLint globals | — | — |
| `prettier` | ^3.9.4 | Format | Existing config | — |
| `tailwindcss` | ^3.4.16 | Utility CSS | Existing | CSS-in-JS |
| `postcss` | ^8.4.49 | Tailwind pipeline | — | — |
| `autoprefixer` | ^10.4.20 | Vendor prefixes | — | — |
| `concurrently` | ^9.1.0 | `dev` web+api | One command | compound scripts |
| `js-yaml` | ^5.4.2 | Atlas export | Literal blocks | — |
| `@types/js-yaml` | ^4.0.9 | YAML types | — | — |
| `@types/node` | ^22.10.2 | Node types | — | — |
| `@types/react` / `@types/react-dom` | ^18.3.x | React types | — | — |
| `@types/cors` / `@types/express` | ^2.8.17 / ^4.17.21 | Express types | — | — |

`.nvmrc` is `20`. `engines.node` is `>=20`.

## CI / CD

GitHub Actions: `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, npm cache), `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`. Workflows: `.github/workflows/ci.yml`, `deploy-pages.yml`.

## Cognite artefacts (not npm)

Toolkit YAML under `cdf/modules/pharmaops_deviation/`, CLI agent under `cdf/agents/pharmaops-triage/`. No `cognite-sdk`, no `@cognite/cli`, no `@cognite/app-sdk` installed — those appear at migration time ([11-cdf-migration-path.md](./11-cdf-migration-path.md)).
