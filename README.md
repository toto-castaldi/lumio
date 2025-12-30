# Lumio

AI-powered flashcard study platform. 

```
Leggi CHANGELOG.md, CLAUDE.md, README.md e tutta la cartella DOCS. Ora sei pronto.
```


**Production**: https://lumio.toto-castaldi.com/

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase CLI (for local development)

### Setup

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local

# Build shared packages (required before running apps)
pnpm build:packages

# Start Supabase local (optional)
supabase start
# Studio: http://127.0.0.1:54323
# API: http://127.0.0.1:54321

# Run web app
pnpm dev:web
# http://localhost:5173

# Run mobile PWA (in another terminal)
pnpm dev:mobile
# http://localhost:5174
```

## Project Structure

```
lumio/
├── apps/
│   ├── web/          # React 19 + Vite + Tailwind + shadcn/ui
│   └── mobile/       # PWA - React 19 + Vite + Tailwind + shadcn/ui
├── packages/
│   ├── shared/       # @lumio/shared - types, constants, VERSION
│   └── core/         # @lumio/core - Supabase client
├── supabase/
│   ├── functions/    # Edge Functions
│   └── migrations/   # SQL migrations
├── conf/             # Server configuration (Nginx)
└── docs/             # Documentation
```

## Scripts

| Command | Description | URL |
|---------|-------------|-----|
| `pnpm dev:web` | Start web app dev server | http://localhost:5173 |
| `pnpm dev:mobile` | Start mobile PWA dev server | http://localhost:5174 |
| `pnpm build:web` | Build web app for production | |
| `pnpm build:mobile` | Build mobile PWA for production | |
| `pnpm build:packages` | Build shared packages | |
| `pnpm typecheck` | Run TypeScript type checking | |
| `supabase start` | Start local Supabase | http://127.0.0.1:54323 (Studio) |

## Documentation

- [PRD](./docs/PRD.md) - Vision, features, success metrics
- [Technical Architecture](./docs/TECHNICAL-ARCHITECTURE.md) - Stack, CI/CD, deployment
- [Data Model](./docs/DATA-MODEL.md) - PostgreSQL schema, RLS policies
- [Card Format Spec](./docs/CARD-FORMAT-SPEC.md) - Markdown card format
- [User Flows](./docs/USER-FLOWS.md) - Onboarding, study, goals
- [Roadmap](./docs/ROADMAP.md) - Development phases

## Deployment

### Web App

Deployed automatically to DigitalOcean on push to `main` via GitHub Actions.

- **URL**: https://lumio.toto-castaldi.com
- **Server path**: `/var/www/lumio`

### Mobile App (PWA)

Deployed automatically to DigitalOcean on push to `main` via GitHub Actions.

- **URL**: https://m-lumio.toto-castaldi.com
- **Server path**: `/var/www/lumio-mobile`

## Environment Variables

See `.env.example` files in each app for required variables.

### GitHub Secrets (for CI/CD)

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `DO_HOST` | DigitalOcean droplet IP |
| `DO_USERNAME` | SSH username |
| `DO_SSH_KEY` | SSH private key |

## License

Private - All rights reserved.
