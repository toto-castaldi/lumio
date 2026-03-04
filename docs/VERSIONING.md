# Versioning Guidelines

Standard per il versionamento nei progetti personali di Toto Castaldi, basato sull'implementazione di Lumio.

---

## Principi

1. **Single Source of Truth** -- la versione vive in `.planning/STATE.md`, con override da git tag se piu' recente
2. **Build-time injection** -- i valori vengono baked-in negli artefatti durante il build, mai letti a runtime da env vars
3. **Zero dipendenze esterne** -- niente release-please, niente conventional commits obbligatori, niente git tags automatici
4. **Propagazione atomica** -- un push su main aggiorna tutte le superfici (app, sito, API, release) in lockstep
5. **GSD-native** -- il numero di versione si incrementa con i milestone del workflow GSD

## Formato versione

```
major.minor          -- versione base (es. 1.7)
v1.7+dev             -- build locale
v1.7+108.a3bc02d     -- build CI (run_number.short_sha)
```

Solo `major.minor`, niente patch. La versione incrementa quando inizia un nuovo milestone GSD.

---

## Pipeline completo

```
.planning/STATE.md                     <-- SOURCE OF TRUTH (default)
  Milestone: v1.7                          (editato manualmente ad ogni nuovo milestone)
        |
        v
scripts/extract-version.cjs           <-- GENERATORE
  - Legge STATE.md (regex: /^Milestone:\s*v?([\d.]+)/m)
  - Se GIT_TAG e' set e contiene versione > STATE.md, usa il tag
  - Legge env vars: BUILD_NUMBER, GIT_SHA, BUILD_DATE, GIT_TAG
  - Genera packages/shared/src/version.ts (string literals)
  - Sincronizza package.json root
  - Stampa versione su stdout (per CI)
        ^
        |
  GIT_TAG=${{ github.ref_name }}       <-- CI passa il nome del tag/branch
        |
        v
packages/shared/src/version.ts        <-- ARTEFATTO GENERATO
  - VERSION = "1.7"
  - BUILD_INFO = { version, buildNumber, gitSha, buildDate }
  - getDisplayVersion() -> "v1.7+108.a3bc02d" o "v1.7+dev"
  - getVersionString()  -> "v1.7"
        |
        +---> App Android (SettingsScreen)
        +---> Qualsiasi consumer TypeScript/JavaScript
        |
        v
CI/CD (.github/workflows/ci-deploy.yml)
  |
  +---> build-apk
  |       - Passa BUILD_NUMBER + GIT_SHA a extract-version.cjs
  |       - pnpm build:packages (bake-in valori in version.ts)
  |       - Gradle: -PversionCode={run_number} -PversionName=1.7
  |       - Upload artifact: lumio-apk-v1.7-build108
  |
  +---> create-release
  |       - Download artifact, rinomina in lumio.apk
  |       - softprops/action-gh-release@v2
  |       - Tag: v1.7, asset: lumio.apk, make_latest: true
  |
  +---> deploy-landing
  |       - sed: __LUMIO_VERSION__ -> 1.7+108.a3bc02d
  |       - SCP deploy
  |
  +---> deploy-functions
          - Env vars: LUMIO_VERSION, BUILD_NUMBER, GIT_SHA, BUILD_DATE
          - Endpoint /version serve JSON con i metadati
```

---

## Source of Truth: STATE.md

Il campo `Milestone` in `.planning/STATE.md`:

```markdown
Milestone: v1.7 (completed)
```

Il regex di estrazione ignora il suffisso `(completed)` e il prefisso `v`:
```javascript
const match = stateContent.match(/^Milestone:\s*v?([\d.]+)/m);
```

**Come aggiornare la versione:** editare questo campo, committare, pushare su main. Il CI propaga automaticamente.

---

## Git Tag Override

Quando un build CI viene triggerato da un git tag (es. `v2.2`), lo script `extract-version.cjs` confronta la versione del tag con quella in STATE.md:

- Se la versione del tag e' **strettamente maggiore** di STATE.md, viene usata la versione del tag
- Se la versione del tag e' uguale o inferiore, STATE.md rimane la source of truth
- Il confronto e' **semantico** (segmento per segmento): `2.1 < 2.2`, `1.9 < 2.0`

Questo consente di bumpare la versione con un semplice tag push:

```bash
git tag v2.2
git push --tags
# Il CI usa v2.2 come versione (se > STATE.md)
```

Il meccanismo funziona tramite la env var `GIT_TAG` passata dal CI workflow, che contiene `github.ref_name` (il nome del tag, es. `v2.2`). Per push su branch, `github.ref_name` e' il nome del branch (es. `main`), che non matcha il pattern versione e viene ignorato.

STATE.md rimane la source of truth predefinita per i push su branch. I build locali (senza `GIT_TAG`) funzionano esattamente come prima.

---

## Script di estrazione

**File:** `scripts/extract-version.cjs`

Script CommonJS senza dipendenze esterne. Usa solo `fs` e `path` di Node.js.

### Cosa fa (in ordine)

1. Legge `.planning/STATE.md`
2. Estrae la versione dal campo Milestone
3. Legge build metadata dalle env vars (con fallback per dev locale):
   ```javascript
   const buildNumber = process.env.BUILD_NUMBER || "dev";
   const gitSha = process.env.COMMIT_SHA || process.env.GIT_SHA || "local";
   const buildDate = process.env.BUILD_DATE || new Date().toISOString();
   ```
4. Genera `packages/shared/src/version.ts` con **string literals** (non riferimenti a `process.env`)
5. Sincronizza il campo `version` in `package.json` root
6. Stampa la versione su stdout

### Perche string literals e non process.env

React Native non ha `process.env` a runtime. Se `version.ts` contenesse `process.env.BUILD_NUMBER || "dev"`:
- tsup/esbuild compila ma NON inlinea `process.env`
- Metro bundla il codice compilato
- A runtime su Android, `process.env.BUILD_NUMBER` e' `undefined`
- Risultato: sempre `"dev"`

Con string literals il valore viene scritto direttamente nel sorgente:
```typescript
// Generato da extract-version.cjs con BUILD_NUMBER=108
buildNumber: "108",  // <-- stringa letterale, non process.env
```

### Exit codes

| Codice | Significato |
|--------|-------------|
| 0 | Successo |
| 1 | STATE.md non trovato o campo Milestone mancante |

### Uso

```bash
# Locale (dev)
node scripts/extract-version.cjs
# Genera: buildNumber: "dev", gitSha: "local"

# CI
BUILD_NUMBER=${{ github.run_number }} GIT_SHA=${{ github.sha }} node scripts/extract-version.cjs
# Genera: buildNumber: "108", gitSha: "a3bc02d..."
```

---

## File generato: version.ts

**File:** `packages/shared/src/version.ts` (auto-generato, non editare)

```typescript
export const VERSION = "1.7";

export const BUILD_INFO: {
  readonly version: string;
  readonly buildNumber: string;
  readonly gitSha: string;
  readonly buildDate: string;
} = {
  version: VERSION,
  buildNumber: "dev",       // "108" in CI
  gitSha: "local",          // "a3bc02d..." in CI
  buildDate: "2026-02-23T14:32:17Z",
};

export type BuildInfo = typeof BUILD_INFO;

export function getDisplayVersion(): string {
  if (BUILD_INFO.buildNumber === "dev") {
    return `v${BUILD_INFO.version}+dev`;
  }
  return `v${BUILD_INFO.version}+${BUILD_INFO.buildNumber}.${BUILD_INFO.gitSha.slice(0, 7)}`;
}
```

**Nota TypeScript:** `BUILD_INFO` ha un'annotazione di tipo esplicita (`{ readonly ...: string }`) invece di `as const`. Questo perche con `as const` TypeScript narrows `buildNumber` al tipo letterale (es. `"108"`), causando errore TS2367 nel confronto `=== "dev"`.

---

## CI/CD: job per job

### lint-and-typecheck

Esegue `node scripts/extract-version.cjs` (senza env vars CI) e poi `pnpm build:packages`. Serve per avere `version.ts` aggiornato durante il typecheck.

### build-apk

```yaml
- name: Extract version from STATE.md
  id: version
  run: |
    VERSION=$(node scripts/extract-version.cjs)
    echo "version=$VERSION" >> $GITHUB_OUTPUT
    echo "build_number=${{ github.run_number }}" >> $GITHUB_OUTPUT
    echo "git_sha=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT
  env:
    BUILD_NUMBER: ${{ github.run_number }}
    GIT_SHA: ${{ github.sha }}
```

Le env vars sono settate **sullo step che esegue lo script**, non sugli step successivi. Questo perche `extract-version.cjs` legge le env vars al momento della generazione e le scrive come stringhe letterali in `version.ts`.

**Gradle:**
```bash
./gradlew app:assembleRelease \
  -PversionCode=${{ github.run_number }} \
  -PversionName=${{ steps.version.outputs.version }}
```

| Parametro | Sorgente | Esempio |
|-----------|----------|---------|
| `versionCode` | `github.run_number` | `108` |
| `versionName` | Step output `version` | `1.7` |

**Job outputs:** espone `version` per il job `create-release` downstream.

**Naming APK:**
```
lumio-v1.7+108.a3bc02d.apk    <-- artifact uploadato (con versione)
lumio.apk                      <-- rinominato in create-release (per URL stabile)
```

### create-release

```yaml
- uses: softprops/action-gh-release@v2
  with:
    tag_name: v${{ needs.build-apk.outputs.version }}
    name: v${{ needs.build-apk.outputs.version }}
    body: "Lumio v... - Build #108 (a3bc02d)"
    files: lumio.apk
    make_latest: true
```

`make_latest: true` garantisce che `/releases/latest/download/lumio.apk` punti sempre all'ultima release.

### deploy-landing

```yaml
- name: Inject version into landing page
  run: |
    SHORT_SHA=${GITHUB_SHA::7}
    DISPLAY_VERSION="${{ steps.version.outputs.version }}+${{ github.run_number }}.${SHORT_SHA}"
    sed -i "s/__LUMIO_VERSION__/${DISPLAY_VERSION}/g" apps/landing/index.html
```

Usa il placeholder `__LUMIO_VERSION__` nell'HTML. Il deploy avviene via SCP su DigitalOcean.

### deploy-functions

Passa versione e metadata come env vars alle Edge Functions Supabase:
```yaml
env:
  LUMIO_VERSION: ${{ steps.version.outputs.version }}
  BUILD_NUMBER: ${{ steps.version.outputs.build_number }}
  GIT_SHA: ${{ steps.version.outputs.git_sha }}
  BUILD_DATE: ${{ steps.version.outputs.build_date }}
```

L'endpoint `/version` in Deno legge queste con `Deno.env.get()` (a differenza di React Native, Deno ha accesso alle env vars a runtime).

---

## Superfici della versione

Dove l'utente vede la versione:

| Superficie | Formato | Meccanismo |
|------------|---------|------------|
| App Android (Impostazioni) | `v1.7+108.a3bc02d` | `getDisplayVersion()` da `@lumio/shared` |
| Landing page (footer) | `v1.7+108.a3bc02d` | `sed` su `__LUMIO_VERSION__` placeholder |
| GitHub Release | `v1.7` (tag), `lumio.apk` (asset) | `softprops/action-gh-release@v2` |
| Edge Function `/version` | JSON con tutti i campi | `Deno.env.get()` |
| APK `versionName` (Android system) | `1.7` | Gradle `-PversionName` |
| APK `versionCode` (Android system) | `108` | Gradle `-PversionCode` (monotonically increasing) |

---

## Integrazione GSD

Il versionamento e' integrato nel workflow GSD:

1. **Nuovo milestone** (`/gsd:new-milestone`) -- incrementa il campo `Milestone` in STATE.md
2. **Pianificazione fasi** -- le fasi di un milestone lavorano sulla stessa versione
3. **Quick tasks** -- possono modificare l'infrastruttura di versionamento (come i quick tasks 1-4 di Lumio v1.7)
4. **Completamento milestone** (`/gsd:complete-milestone`) -- archivia e prepara il campo per il prossimo

Il CI legge STATE.md ad ogni push, quindi la versione si aggiorna automaticamente quando il campo cambia.

---

## Come bumpare la versione

### Metodo 1: Editare STATE.md (standard)

```bash
# 1. Editare STATE.md
#    Cambiare: Milestone: v1.7
#    In:       Milestone: v1.8

# 2. Committare e pushare
git add .planning/STATE.md
git commit -m "chore: bump version to v1.8"
git push

# 3. Il CI fa tutto il resto:
#    - Genera version.ts con "1.8"
#    - Builda APK con versionName=1.8
#    - Crea GitHub Release v1.8
#    - Aggiorna landing page
#    - Deploya Edge Functions con LUMIO_VERSION=1.8
```

### Metodo 2: Git tag (lightweight)

```bash
# 1. Creare e pushare un tag con versione > STATE.md
git tag v1.8
git push --tags

# 2. Il CI si attiva sul tag push:
#    - extract-version.cjs confronta v1.8 con STATE.md (es. v1.7)
#    - Se il tag e' maggiore, usa v1.8
#    - Builda, deploya e rilascia con versione 1.8
```

**Nota:** Il tag deve puntare a un commit su main. STATE.md non viene modificato automaticamente -- va aggiornato manualmente se si vuole che i build futuri su branch usino la nuova versione.

---

## Checklist per nuovi progetti

Per replicare questo sistema in un nuovo progetto:

- [ ] Creare `.planning/STATE.md` con campo `Milestone: v0.1`
- [ ] Creare `scripts/extract-version.cjs` (copiare da Lumio, adattare paths)
- [ ] Creare il package shared con `version.ts` generato
- [ ] Aggiungere `"extract-version": "node scripts/extract-version.cjs"` a package.json
- [ ] In CI, settare `BUILD_NUMBER` e `GIT_SHA` env vars sullo step che esegue lo script
- [ ] Per React Native/mobile: verificare che `version.ts` usi string literals (non `process.env`)
- [ ] Per landing page: usare placeholder `__LUMIO_VERSION__` + `sed` in CI
- [ ] Per GitHub Releases: aggiungere job con `softprops/action-gh-release@v2` e `make_latest: true`
- [ ] Per backend (Deno/Node server): passare env vars al deploy (queste funzionano a runtime)

---

## Lezioni apprese

1. **`process.env` non esiste in React Native** -- usare string literals generati a build time
2. **`as const` con valori hardcoded causa TS2367** -- usare annotazione di tipo esplicita `{ readonly ...: string }`
3. **Le env vars CI vanno sullo step che esegue lo script**, non sugli step successivi che consumano l'output
4. **`make_latest: true`** su GitHub Release e' essenziale perche `/releases/latest/download/` funzioni
5. **L'APK nell'artifact ha nome con versione**, ma viene rinominato a nome stabile (`lumio.apk`) per la release
6. **`github.run_number`** e' perfetto come build number: monotonicamente crescente, unico per workflow

## Legacy (rimosso)

Infrastruttura rimossa in v1.7 Phase 20-22:
- husky, commitlint, commitizen
- release-please, auto-release CI workflow
- Git tags automatici, CHANGELOG.md
- Conventional commits obbligatori

Sostituita dal modello GSD: una riga in STATE.md, zero tooling.

---
*Standard versionamento - basato su Lumio v1.7, febbraio 2026*
