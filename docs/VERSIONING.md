# Versioning Strategy

> Specifica per il sistema di versioning di Lumio con Commitizen e Conventional Commits.

## Overview

Lumio usa **Semantic Versioning** (SemVer) con una **singola versione** che governa tutti gli artefatti:

- Web app
- Mobile app (iOS/Android)
- Supabase Edge Functions

La versione è gestita tramite **Commitizen** + **standard-version** per:
- Commit guidati con Conventional Commits
- Bump automatico basato sui commit
- Generazione automatica del CHANGELOG

## Single Source of Truth

```
packages/shared/src/version.ts  ← UNICA fonte di verità
```

Tutti gli artefatti importano o leggono la versione da qui.

## Componenti del Sistema

| Componente | Descrizione |
|------------|-------------|
| `VERSION` | Versione semantica (es. `1.2.3`) — gestita da te |
| `BUILD_NUMBER` | Numero incrementale per store mobile — generato da CI |
| `GIT_SHA` | Short SHA del commit — generato da CI |
| `BUILD_DATE` | Timestamp del build — generato da CI |

## Propagazione Versione

| Artefatto | Dove visibile | Come |
|-----------|---------------|------|
| **Web** | Footer + `/api/version` | Import da `@lumio/shared` |
| **Mobile** | About screen | `app.json` sincronizzato da script |
| **Supabase** | Header `X-Lumio-Version` + endpoint `/version` | Env var `LUMIO_VERSION` |

---

## File da Creare/Modificare

### Struttura Completa

```
lumio/
├── .czrc                           # Config Commitizen  
├── .commitlintrc.json              # Validazione commits
├── .husky/
│   ├── prepare-commit-msg          # Hook per cz
│   └── commit-msg                  # Hook per commitlint
├── CHANGELOG.md                    # Generato automaticamente
├── package.json                    # Scripts + devDeps
│
├── packages/shared/
│   └── src/
│       ├── version.ts              # Export VERSION + BUILD_INFO
│       └── index.ts                # Re-export version
│
├── apps/web/
│   └── src/
│       └── components/
│           └── VersionBadge.tsx    # Componente footer
│
├── apps/mobile/
│   ├── app.json                    # version sincronizzata
│   └── eas.json                    # autoIncrement per store
│
├── supabase/functions/
│   └── version/
│       └── index.ts                # Edge function /version
│
├── scripts/
│   ├── version-updater.js          # Per standard-version
│   └── bump-version.js             # Post-bump sync
│
└── .github/workflows/
    └── ci.yml                      # Version injection
```

---

## Implementazione

### 1. Root Config Files

#### `.czrc`
```json
{
  "path": "cz-conventional-changelog"
}
```

#### `.commitlintrc.json`
```json
{
  "extends": ["@commitlint/config-conventional"]
}
```

#### `package.json` (aggiunte al root)

```json
{
  "scripts": {
    "commit": "cz",
    "release": "standard-version && node scripts/bump-version.js",
    "release:dry": "standard-version --dry-run",
    "prepare": "husky install"
  },
  "devDependencies": {
    "commitizen": "^4.3.0",
    "cz-conventional-changelog": "^3.3.0",
    "@commitlint/cli": "^18.4.0",
    "@commitlint/config-conventional": "^18.4.0",
    "standard-version": "^9.5.0",
    "husky": "^8.0.0"
  },
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  },
  "standard-version": {
    "bumpFiles": [
      {
        "filename": "packages/shared/src/version.ts",
        "updater": "scripts/version-updater.js"
      },
      {
        "filename": "apps/mobile/app.json",
        "updater": "scripts/app-json-updater.js"
      }
    ]
  }
}
```

---

### 2. Version Source (`packages/shared/src/version.ts`)

```typescript
/**
 * Lumio Version - Single Source of Truth
 * 
 * Questa versione viene aggiornata automaticamente da `pnpm release`.
 * NON modificare manualmente.
 */
export const VERSION = "0.1.0";

/**
 * Build info popolate a build time dalla CI.
 * In sviluppo locale usa valori di default.
 */
export const BUILD_INFO = {
  version: VERSION,
  buildNumber: process.env.VITE_BUILD_NUMBER || process.env.BUILD_NUMBER || "dev",
  gitSha: process.env.VITE_GIT_SHA || process.env.GIT_SHA || "local",
  buildDate: process.env.VITE_BUILD_DATE || process.env.BUILD_DATE || new Date().toISOString(),
} as const;

/**
 * Stringa formattata per display
 */
export function getVersionString(): string {
  return `v${BUILD_INFO.version}`;
}

/**
 * Stringa completa per debug
 */
export function getFullVersionString(): string {
  return `v${BUILD_INFO.version} (${BUILD_INFO.buildNumber}-${BUILD_INFO.gitSha})`;
}
```

#### `packages/shared/src/index.ts` (aggiungere export)

```typescript
// Version
export { VERSION, BUILD_INFO, getVersionString, getFullVersionString } from "./version";

// ... altri export esistenti
```

---

### 3. Scripts

#### `scripts/version-updater.js`

```javascript
/**
 * Custom updater per standard-version.
 * Aggiorna VERSION in version.ts
 */
const versionRegex = /export const VERSION = "(.+)";/;

module.exports.readVersion = function (contents) {
  const match = contents.match(versionRegex);
  if (!match) {
    throw new Error("Could not find VERSION in version.ts");
  }
  return match[1];
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(versionRegex, `export const VERSION = "${version}";`);
};
```

#### `scripts/app-json-updater.js`

```javascript
/**
 * Custom updater per standard-version.
 * Aggiorna version in app.json (Expo)
 */
module.exports.readVersion = function (contents) {
  const json = JSON.parse(contents);
  return json.expo?.version || "0.0.0";
};

module.exports.writeVersion = function (contents, version) {
  const json = JSON.parse(contents);
  json.expo.version = version;
  return JSON.stringify(json, null, 2) + "\n";
};
```

#### `scripts/bump-version.js`

```javascript
#!/usr/bin/env node
/**
 * Post-bump script.
 * Eseguito dopo standard-version per sincronizzare la versione.
 */
const fs = require("fs");
const path = require("path");

// Legge versione da shared
const versionFilePath = path.join(__dirname, "../packages/shared/src/version.ts");
const versionFile = fs.readFileSync(versionFilePath, "utf8");
const match = versionFile.match(/VERSION = "(.+)"/);

if (!match) {
  console.error("❌ Could not read VERSION from version.ts");
  process.exit(1);
}

const version = match[1];
console.log(`📦 Version: ${version}`);

// Verifica che app.json sia sincronizzato (dovrebbe già esserlo da standard-version)
const appJsonPath = path.join(__dirname, "../apps/mobile/app.json");
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
  if (appJson.expo.version !== version) {
    appJson.expo.version = version;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");
    console.log(`✅ Synced version to apps/mobile/app.json`);
  } else {
    console.log(`✅ apps/mobile/app.json already in sync`);
  }
}

console.log(`\n🚀 Ready to push: git push --follow-tags origin main`);
```

---

### 4. Husky Hooks

#### Setup iniziale (eseguire una volta)

```bash
pnpm install
npx husky install
npx husky add .husky/prepare-commit-msg "exec < /dev/tty && npx cz --hook || true"
npx husky add .husky/commit-msg "npx --no -- commitlint --edit \$1"
```

#### `.husky/prepare-commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Solo se è un commit interattivo (non merge, amend, ecc.)
if [ -z "$2" ]; then
  exec < /dev/tty && npx cz --hook || true
fi
```

#### `.husky/commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

---

### 5. Web App - Version Badge

#### `apps/web/src/components/VersionBadge.tsx`

```tsx
import { BUILD_INFO, getVersionString } from "@lumio/shared";

interface VersionBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export function VersionBadge({ className = "", showDetails = false }: VersionBadgeProps) {
  const detailsTitle = `Build: ${BUILD_INFO.buildNumber}\nSHA: ${BUILD_INFO.gitSha}\nDate: ${BUILD_INFO.buildDate}`;

  if (showDetails) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        <span>{getVersionString()}</span>
        <span className="ml-2 opacity-50">
          ({BUILD_INFO.buildNumber}-{BUILD_INFO.gitSha.slice(0, 7)})
        </span>
      </div>
    );
  }

  return (
    <span 
      className={`text-xs text-muted-foreground cursor-help ${className}`}
      title={detailsTitle}
    >
      {getVersionString()}
    </span>
  );
}
```

#### Utilizzo nel Layout/Footer

```tsx
import { VersionBadge } from "@/components/VersionBadge";

export function Footer() {
  return (
    <footer className="border-t py-4">
      <div className="container flex justify-between items-center">
        <span>© 2025 Lumio</span>
        <VersionBadge />
      </div>
    </footer>
  );
}
```

---

### 6. Mobile App

#### `apps/mobile/app.json`

```json
{
  "expo": {
    "name": "Lumio",
    "slug": "lumio",
    "version": "0.1.0",
    "ios": {
      "bundleIdentifier": "com.lumio.app",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.lumio.app",
      "versionCode": 1
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

#### `apps/mobile/eas.json`

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "buildNumber": "auto"
      },
      "android": {
        "versionCode": "auto"
      }
    },
    "production": {
      "ios": {
        "buildNumber": "auto"
      },
      "android": {
        "versionCode": "auto"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

> **Nota**: `"auto"` fa sì che EAS Build incrementi automaticamente il build number ad ogni build.

#### `apps/mobile/src/components/VersionBadge.tsx`

```tsx
import { Text, View } from "react-native";
import { BUILD_INFO, getVersionString } from "@lumio/shared";

interface VersionBadgeProps {
  showDetails?: boolean;
}

export function VersionBadge({ showDetails = false }: VersionBadgeProps) {
  if (showDetails) {
    return (
      <View>
        <Text style={{ fontSize: 12, color: "#666" }}>
          {getVersionString()}
        </Text>
        <Text style={{ fontSize: 10, color: "#999" }}>
          Build: {BUILD_INFO.buildNumber} • {BUILD_INFO.gitSha.slice(0, 7)}
        </Text>
      </View>
    );
  }

  return (
    <Text style={{ fontSize: 12, color: "#666" }}>
      {getVersionString()}
    </Text>
  );
}
```

---

### 7. Supabase Edge Function

#### `supabase/functions/version/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERSION = Deno.env.get("LUMIO_VERSION") || "unknown";
const BUILD_NUMBER = Deno.env.get("BUILD_NUMBER") || "unknown";
const GIT_SHA = Deno.env.get("GIT_SHA") || "unknown";
const BUILD_DATE = Deno.env.get("BUILD_DATE") || new Date().toISOString();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Lumio-Version": VERSION,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const response = {
    version: VERSION,
    buildNumber: BUILD_NUMBER,
    gitSha: GIT_SHA,
    buildDate: BUILD_DATE,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
```

---

### 8. CI/CD Integration

#### `.github/workflows/ci.yml` (sezioni da aggiungere/modificare)

```yaml
name: CI/CD

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Necessario per tag

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Extract version info
        id: version
        run: |
          # Estrae versione da version.ts
          VERSION=$(grep -oP 'VERSION = "\K[^"]+' packages/shared/src/version.ts)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "build_number=${{ github.run_number }}" >> $GITHUB_OUTPUT
          echo "git_sha=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT
          echo "build_date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_OUTPUT
          echo "📦 Version: $VERSION"
          echo "🔢 Build: ${{ github.run_number }}"
          echo "🔑 SHA: ${GITHUB_SHA::7}"

      - name: Build packages
        run: pnpm build:packages
        env:
          BUILD_NUMBER: ${{ steps.version.outputs.build_number }}
          GIT_SHA: ${{ steps.version.outputs.git_sha }}
          BUILD_DATE: ${{ steps.version.outputs.build_date }}

      - name: Build web app
        run: pnpm build:web
        env:
          VITE_BUILD_NUMBER: ${{ steps.version.outputs.build_number }}
          VITE_GIT_SHA: ${{ steps.version.outputs.git_sha }}
          VITE_BUILD_DATE: ${{ steps.version.outputs.build_date }}
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Typecheck
        run: pnpm typecheck

      # Deploy web (solo su main o tag)
      - name: Deploy web to DigitalOcean
        if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USERNAME }}
          key: ${{ secrets.DO_SSH_KEY }}
          source: "apps/web/dist/*"
          target: "/var/www/lumio"
          strip_components: 3

      # Deploy Supabase functions (solo su main o tag)
      - name: Deploy Supabase functions
        if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
        run: |
          npx supabase functions deploy version \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          LUMIO_VERSION: ${{ steps.version.outputs.version }}
          BUILD_NUMBER: ${{ steps.version.outputs.build_number }}
          GIT_SHA: ${{ steps.version.outputs.git_sha }}
          BUILD_DATE: ${{ steps.version.outputs.build_date }}
```

---

## Workflow Quotidiano

### Sviluppo normale

```bash
# Lavori sul codice...

# Commit guidato
git add .
pnpm commit
# → Commitizen chiede: feat? fix? docs? chore? ...
# → Genera commit message tipo: feat(study): add timer component

# Push
git push origin main
```

### Release Automatica (CI/CD)

La release è **completamente automatica**. Quando fai push su `main`:

1. CI esegue lint + typecheck
2. Se ci sono commit `feat` o `fix`, la pipeline:
   - Bumpa la versione in `version.ts` e `app.json`
   - Genera/aggiorna `CHANGELOG.md`
   - Crea commit `chore(release): vX.Y.Z [skip ci]`
   - Crea tag `vX.Y.Z`
   - Pusha il release commit
3. Deploy web, Supabase functions e build Android con la nuova versione

### Release Manuale (opzionale)

```bash
# Preview senza eseguire
pnpm release:dry

# Esegui release manualmente (se necessario)
pnpm release
git push --follow-tags origin main
```

### Verifica versione in produzione

```bash
# Web: visibile nel footer

# Supabase:
curl https://your-project.supabase.co/functions/v1/version
# → {"version":"1.2.0","buildNumber":"47","gitSha":"abc1234",...}

# Header in tutte le risposte Supabase:
# X-Lumio-Version: 1.2.0
```

---

## Conventional Commits Reference

| Tipo | Descrizione | Bump |
|------|-------------|------|
| `feat` | Nuova funzionalità | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Solo documentazione | - |
| `style` | Formatting, semicolons, ecc. | - |
| `refactor` | Refactoring senza feat/fix | - |
| `perf` | Performance improvement | PATCH |
| `test` | Aggiunta/modifica test | - |
| `chore` | Build, CI, dipendenze | - |
| `BREAKING CHANGE` | Nel body/footer | MAJOR |

### Esempi

```bash
feat(study): add timer during study session
fix(auth): handle expired token refresh
docs(readme): update installation steps
chore(deps): upgrade vite to 5.0
feat(goals)!: redesign goal creation flow   # ! = breaking change
```

---

## Troubleshooting

### Husky hooks non funzionano

```bash
# Reinstalla husky
rm -rf .husky
pnpm prepare
npx husky add .husky/prepare-commit-msg "exec < /dev/tty && npx cz --hook || true"
npx husky add .husky/commit-msg "npx --no -- commitlint --edit \$1"
```

### Versione non si aggiorna

```bash
# Verifica che version.ts sia nel formato corretto
cat packages/shared/src/version.ts
# Deve contenere: export const VERSION = "x.y.z";

# Test manuale dell'updater
node -e "const u = require('./scripts/version-updater.js'); console.log(u.readVersion(require('fs').readFileSync('packages/shared/src/version.ts', 'utf8')))"
```

### CI non trova la versione

Assicurati che il grep pattern sia corretto per il tuo formato:
```bash
grep -oP 'VERSION = "\K[^"]+' packages/shared/src/version.ts
```
