# Versioning Strategy

> Specifica per il sistema di versioning di Lumio con Auto-Release e Conventional Commits.

## Overview

Lumio usa **Semantic Versioning** (SemVer) con una **singola versione** che governa tutti gli artefatti:

- Web app
- Mobile app (PWA)
- Supabase Edge Functions

La versione è gestita tramite **Auto-Release** (job custom in GitHub Actions) per:
- Bump automatico basato sui commit (feat/fix)
- Release completamente automatiche senza PR
- Tag Git e deploy immediato

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

### 2. Auto-Release analizza e rilascia

Dopo ogni push su `main`, il job `auto-release`:
- Conta i commit `feat:` e `fix:` dall'ultimo tag
- Calcola la nuova versione (minor per `feat:`, patch per `fix:`, major per breaking `!`)
- Aggiorna automaticamente i file di versione
- Crea commit `chore(release): vX.Y.Z`
- Crea e pusha il tag Git

### 3. Deploy automatico

Dopo il bump di versione:
- I job di deploy fanno `git pull` per ottenere la versione aggiornata
- Web, Mobile e Edge Functions vengono deployati con la nuova versione
- Nessun intervento manuale richiesto

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
| `.release-please-manifest.json` | Versione corrente (usato per tracking) |
| `.github/workflows/ci-deploy.yml` | Workflow unificato (auto-release + CI/CD) |
| `packages/shared/src/version.ts` | Single source of truth per la versione |

### File Aggiornati Automaticamente

Il job `auto-release` aggiorna automaticamente:
- `package.json` (campo `version`)
- `packages/shared/src/version.ts` (cerca il pattern `VERSION = "..."`)
- `.release-please-manifest.json` (per tracking)

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
auto-release analizza i commit (feat/fix)
     │
     ▼
Se ci sono commit releasabili:
     │
     ├─► Calcola nuova versione
     │
     ├─► Aggiorna package.json, version.ts, manifest
     │
     ├─► Commit "chore(release): vX.Y.Z"
     │
     └─► Crea e pusha tag vX.Y.Z
     │
     ▼
Deploy automatico (web, mobile, functions)
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
pnpm exec commitlint --edit $1
```

Commit non conformi vengono rifiutati:

```bash
# Rifiutato
git commit -m "added new feature"

# Accettato
git commit -m "feat: add new feature"
```

## Troubleshooting

### La versione non viene aggiornata

1. Verifica che i commit usino il formato corretto (`feat:`, `fix:`, ecc.)
2. Controlla i log del job `auto-release` nel workflow `ci-deploy.yml`
3. Assicurati che ci siano commit `feat:` o `fix:` dall'ultimo tag

### La versione non si aggiorna in version.ts

Verifica che il file contenga il pattern corretto:
```typescript
export const VERSION = "X.Y.Z"; // x-release-please-version
```

### Voglio forzare una release

Crea un commit `feat:` o `fix:` vuoto:
```bash
git commit --allow-empty -m "feat: trigger release"
git push origin main
```

### Il deploy non ha la versione aggiornata

I job di deploy fanno `git pull origin main` prima di buildare. Se la versione non è corretta:
1. Verifica che il job `auto-release` sia completato con successo
2. Controlla che il commit `chore(release)` sia presente su main
3. Riesegui il workflow manualmente se necessario
