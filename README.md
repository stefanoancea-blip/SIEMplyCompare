# SIEMplyCompare

Compare SIEM and security platforms side by side. Browse platforms, compare two products side by side with category scores, and use AI to generate comparison documents you can export as Word or PDF.

## Features

- **Platforms** – Browse all platforms with descriptions, tags, and per-category scores and notes.
- **Compare** – Select two platforms and view a side-by-side comparison table (categories, scores, notes, overall score).
- **AI comparison document** – After selecting two platforms, generate a brief report (high-level overview, technical comparison, commercial comparison) using OpenAI. Export as **Word (.docx)** or **PDF** (via browser print).
- **Admin**
  - **Platforms** – Add, edit, and remove platforms. Populate or re-score category scores with AI. Suggest a new platform from a name (and optional URL) using AI.
  - **Categories** – Add, edit, and remove comparison categories. Optional prompt guidance per category for consistent AI scoring. Re-score a category with AI across all platforms.
  - **API Key** – Configure the OpenAI API key used by all AI features (stored in `data/.settings.json`; not committed to git).

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, TypeScript, Tailwind CSS
- **AI:** OpenAI Chat Completions (model: gpt-4.1)
- **Export:** `docx` for Word; browser print for PDF

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (or yarn/pnpm)
- **OpenAI API key** (for AI features: scoring, platform suggestion, comparison document). Configure in Admin → API Key after first run, or set `OPENAI_API_KEY` in the environment.

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd compareMe
npm install
```

### 2. Run in development

```bash
npm run dev
```

Open the URL shown in the terminal (e.g. **http://localhost:3000**). If port 3000 is in use, Next.js will use the next available port (e.g. 3001).

### 3. Configure OpenAI (for AI features)

- Go to **Admin → API Key**.
- Enter your OpenAI API key (starts with `sk-`) and save.

Alternatively, set the environment variable before starting the app:

```bash
set OPENAI_API_KEY=sk-your-key-here
npm run dev
```

The app uses the key from Admin settings first; if none is set, it falls back to `OPENAI_API_KEY`.

## Build for production

```bash
npm run build
npm run start
```

The production server listens on port 3000 by default (or the next free port if 3000 is taken).

## Project structure

```
compareMe/
├── data/                    # JSON data (committed)
│   ├── platforms.json      # Platform definitions and category scores
│   └── categories.json     # Category definitions and optional prompt guidance
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # Home
│   │   ├── platforms/      # Public platform list and detail
│   │   ├── compare/        # Compare two platforms + AI document export
│   │   └── admin/          # Admin: platforms, categories, add platform, API key
│   ├── app/api/            # API routes
│   │   ├── compare/        # GET comparison, POST generate, POST export-docx
│   │   ├── platforms/      # GET list, GET by id
│   │   ├── categories/     # GET list
│   │   └── admin/          # CRUD platforms/categories, settings, AI (suggest-*)
│   ├── components/         # Nav, Footer, Button, etc.
│   ├── lib/                # Shared logic
│   │   ├── openai.ts       # getOpenAIKey(), OPENAI_CHAT_MODEL
│   │   ├── compare.ts      # comparePlatforms()
│   │   └── platforms.ts    # getPlatforms(), getCategories(), etc.
│   └── types/              # TypeScript types (Platform, Category, etc.)
├── .gitignore
├── package.json
└── README.md
```

**Note:** `data/.settings.json` (OpenAI API key) is in `.gitignore` and is not committed. Create it via Admin → API Key or by setting `OPENAI_API_KEY` in the environment.

## Data

- **platforms.json** – Array of platforms. Each has `id`, `name`, `description`, `websiteUrl`, `tags`, `deploymentModel`, `pricingModel`, `targetCustomerSize`, `categories` (scores and notes per category id), `strengths`, `weaknesses`, `differentiators`, `notes`, etc.
- **categories.json** – Array of categories. Each has `id`, `label`, optional `description`, and optional `promptGuidance` (used by AI when scoring that category).

You can edit these files directly or use the Admin UI. Back them up before bulk edits.

## Scripts

| Command         | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Start dev server (hot reload)  |
| `npm run build`| Build for production           |
| `npm run start`| Run production server          |
| `npm run lint` | Run ESLint                     |

## License

Private / internal use unless otherwise specified.
