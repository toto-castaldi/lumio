# Versioning Strategy

> Specifica per il sistema di versioning di Lumio con release-please e Conventional Commits.

## Overview

Lumio usa **Semantic Versioning** (SemVer) con una **singola versione** che governa tutti gli artefatti:

- Web app
- Mobile app (PWA)
- Supabase Edge Functions

La versione è gestita tramite **release-please** (GitHub Action di Google) per:
- Bump automatico basato sui commit
- Generazione automatica del CHANGELOG
- Creazione di Release PR revisionate

## Single Source of Truth

```
packages/shared/src/version.ts  ← UNICA fonte di verità
```

Tutti gli artefatti importano la versione da qui.

## Come Funziona

### 1. Scrivi commit con Conventional Commits

```bash
git commit -m "feat: add dark mode"
git commit -m "fix: correct login redirect"
git push origin main
```

### 2. release-please crea una Release PR

Dopo ogni push su `main`, release-please:
- Analizza i commit
- Calcola la nuova versione (minor per `feat:`, patch per `fix:`)
- Crea/aggiorna una PR "Release vX.Y.Z"

### 3. Merge della PR = Release

Quando mergi la Release PR:
- `package.json` viene aggiornato
- `packages/shared/src/version.ts` viene aggiornato
- `CHANGELOG.md` viene aggiornato
- Viene creato un tag Git `vX.Y.Z`
- Viene creata una GitHub Release

## Conventional Commits Reference

| Tipo | Descrizione | Bump |
|------|-------------|------|
| `feat` | Nuova funzionalità | MINOR (0.x.0) |
| `fix` | Bug fix | PATCH (0.0.x) |
| `feat!` o `fix!` | Breaking change | MAJOR (x.0.0) |
| `docs` | Solo documentazione | Nessuno |
| `style` | Formatting | Nessuno |
| `refactor` | Refactoring | Nessuno |
| `perf` | Performance | PATCH |
| `test` | Test | Nessuno |
| `chore` | Build, CI, deps | Nessuno |

### Esempi

```bash
feat(study): add timer during study session    # → 0.2.0
fix(auth): handle expired token refresh        # → 0.1.7
docs(readme): update installation steps        # → no bump
chore(deps): upgrade vite to 6.0               # → no bump
feat!: redesign API response format            # → 1.0.0 (breaking)
```

## Configurazione

### File di Configurazione

| File | Scopo |
|------|-------|
| `release-please-config.json` | Configurazione release-please |
| `.release-please-manifest.json` | Versione corrente |
| `.github/workflows/release-please.yml` | GitHub Action |

### Extra Files

release-please aggiorna automaticamente:
- `package.json` (campo `version`)
- `packages/shared/src/version.ts` (cerca il marker `x-release-please-version`)

## Workflow Quotidiano

### Sviluppo normale

```bash
# Lavori sul codice...

# Commit guidato (opzionale, usa commitizen)
pnpm commit

# Oppure commit manuale con conventional commits
git add .
git commit -m "feat(study): add card preview dialog"

# Push
git push origin main
```

### Processo di Release

```
Push su main
     │
     ▼
release-please analizza i commit
     │
     ▼
Crea/aggiorna PR "Release vX.Y.Z"
     │
     ▼
[Tu fai review della PR]
     │
     ▼
Merge della PR
     │
     ▼
Tag creato + GitHub Release + Deploy automatico
```

### Verifica versione in produzione

```bash
# Web: visibile nel footer

# Supabase Edge Function:
curl https://your-project.supabase.co/functions/v1/version
# → {"version":"1.2.0","buildNumber":"47","gitSha":"abc1234",...}
```

## Componenti del Sistema

| Componente | Descrizione |
|------------|-------------|
| `VERSION` | Versione semantica (es. `1.2.3`) |
| `BUILD_NUMBER` | Numero run GitHub Actions |
| `GIT_SHA` | Short SHA del commit |
| `BUILD_DATE` | Timestamp del build |

## Propagazione Versione

| Artefatto | Dove visibile | Come |
|-----------|---------------|------|
| **Web** | Footer + `/api/version` | Import da `@lumio/shared` |
| **Mobile** | Footer | Import da `@lumio/shared` |
| **Supabase** | Header `X-Lumio-Version` + endpoint `/version` | Env var letta da `version.ts` |

## Linting dei Commit (Husky)

Il progetto usa **husky** + **commitlint** per validare i commit:

```bash
# Hook attivo in .husky/commit-msg
npx --no -- commitlint --edit $1
```

Commit non conformi vengono rifiutati:

```bash
# Rifiutato
git commit -m "added new feature"

# Accettato
git commit -m "feat: add new feature"
```

## Troubleshooting

### La Release PR non viene creata

1. Verifica che i commit usino il formato corretto (`feat:`, `fix:`, ecc.)
2. Controlla i log del workflow `release-please.yml`
3. Assicurati che `GITHUB_TOKEN` abbia permessi `contents: write` e `pull-requests: write`

### La versione non si aggiorna in version.ts

Verifica che il file contenga il marker:
```typescript
export const VERSION = "0.1.6"; // x-release-please-version
```

### Voglio forzare una release

Mergia la Release PR esistente. Se non c'è, crea un commit `feat:` o `fix:` vuoto:
```bash
git commit --allow-empty -m "feat: trigger release"
git push origin main
```
