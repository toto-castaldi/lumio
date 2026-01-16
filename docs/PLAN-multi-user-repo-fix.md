# Piano: Repository Condivisi (Architettura Multi-Utente)

**Stato**: ✅ COMPLETATO (2026-01-16)

---

## Problema

Quando due utenti diversi registrano lo stesso repository GitHub, i webhook di Docora falliscono con errore 400.

### Root Cause

```typescript
// docora-webhook/index.ts - usa .single() che richiede esattamente 1 risultato
const { data, error } = await serviceClient
  .from("repositories")
  .eq("docora_repository_id", docoraRepositoryId)
  .single();  // ❌ FALLISCE se ci sono 2+ record!
```

Quando Utente A e Utente B registrano lo stesso repo, Docora ritorna lo stesso `repository_id` per entrambi. La query trova 2 record → errore PostgREST → HTTP 400.

---

## Soluzione: Repository Condivisi

Invece di un fix temporaneo, ristrutturiamo il database per supportare nativamente più utenti sullo stesso repository.

### Nuovo Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                        NUOVO SCHEMA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   repositories (CONDIVISO)              user_repositories        │
│   ┌─────────────────────┐              ┌──────────────────┐     │
│   │ id (PK)             │◄─────────────│ repository_id(FK)│     │
│   │ url (UNIQUE)        │              │ user_id (FK)     │     │
│   │ docora_repo_id (UQ) │              │ created_at       │     │
│   │ name                │              └──────────────────┘     │
│   │ description         │                      │                │
│   │ format_version      │                      │                │
│   │ sync_status         │                      │                │
│   │ timestamps          │                      │                │
│   └─────────┬───────────┘                      │                │
│             │                                  │                │
│             │                                  │                │
│   ┌─────────▼───────────┐                      │                │
│   │ cards (CONDIVISO)   │                      │                │
│   ├─────────────────────┤                      │                │
│   │ id (PK)             │◄─────────────────────┼────────┐       │
│   │ repository_id (FK)  │                      │        │       │
│   │ file_path           │                      │        │       │
│   │ title, content      │                      │        │       │
│   │ tags, difficulty    │                      │        │       │
│   └─────────────────────┘                      │        │       │
│                                                │        │       │
│                                                │        │       │
│   ┌─────────────────────┐                      │        │       │
│   │ user_cards          │◄─────────────────────┘        │       │
│   │ (PROGRESSI STUDIO)  │                               │       │
│   ├─────────────────────┤                               │       │
│   │ user_id (FK)        │◄──────────────────────────────┘       │
│   │ card_id (FK)        │                                       │
│   │ sm2_* (algoritmo)   │                                       │
│   │ mastery_score       │                                       │
│   └─────────────────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vantaggi

| Aspetto | Prima | Dopo |
|---------|-------|------|
| Storage cards | N copie (1 per utente) | 1 copia condivisa |
| Storage immagini | N copie | 1 copia condivisa |
| Webhook processing | Fan-out a N utenti | 1 operazione |
| Nuovo utente si iscrive | Aspetta prossimo commit | Vede subito tutte le card |
| Complessità webhook | Alta | Bassa |

---

## Piano di Implementazione

### Fase 1: Database Migration

#### 1.1 Creare tabella `user_repositories`

```sql
CREATE TABLE public.user_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, repository_id)
);

CREATE INDEX idx_user_repositories_user_id ON user_repositories(user_id);
CREATE INDEX idx_user_repositories_repository_id ON user_repositories(repository_id);
```

#### 1.2 Migrare dati esistenti

```sql
-- Per ogni repository esistente, creare entry in user_repositories
INSERT INTO user_repositories (user_id, repository_id, created_at)
SELECT user_id, id, created_at
FROM repositories
WHERE user_id IS NOT NULL;
```

#### 1.3 Gestire repository duplicati

Se Utente A e Utente B hanno lo stesso URL:
- Teniamo UN SOLO repository (quello con più card, o il più vecchio)
- Creiamo entry in `user_repositories` per entrambi gli utenti
- Eliminiamo il repository duplicato

```sql
-- Identificare duplicati
WITH duplicates AS (
    SELECT url, array_agg(id ORDER BY created_at) as repo_ids,
           array_agg(user_id) as user_ids
    FROM repositories
    GROUP BY url
    HAVING COUNT(*) > 1
)
-- ... logica di merge
```

#### 1.4 Modificare tabella `repositories`

```sql
-- Rimuovere user_id (ora in user_repositories)
ALTER TABLE repositories DROP COLUMN user_id;

-- Rendere url e docora_repository_id UNIQUE (non più per-utente)
ALTER TABLE repositories DROP CONSTRAINT IF EXISTS unique_user_docora_repo;
ALTER TABLE repositories ADD CONSTRAINT unique_url UNIQUE (url);
ALTER TABLE repositories ADD CONSTRAINT unique_docora_id UNIQUE (docora_repository_id);
```

#### 1.5 Modificare storage path per immagini

**Problema**: Attualmente il path è `{user_id}/{repo_id}/{file_path}`. Con repository condivisi, deve diventare `{repo_id}/{file_path}`.

```sql
-- Migrazione storage path
UPDATE card_assets
SET storage_path = REGEXP_REPLACE(storage_path, '^[^/]+/', '');
-- Da: "user_abc/repo_xyz/assets/img.png"
-- A:  "repo_xyz/assets/img.png"
```

#### 1.6 Aggiornare RLS Policies

```sql
-- repositories: visibile se l'utente ha un'entry in user_repositories
CREATE POLICY "Users can view subscribed repositories"
    ON repositories FOR SELECT
    USING (
        id IN (SELECT repository_id FROM user_repositories WHERE user_id = auth.uid())
    );

-- cards: visibile se l'utente ha il repository
CREATE POLICY "Users can view cards from subscribed repositories"
    ON cards FOR SELECT
    USING (
        repository_id IN (
            SELECT repository_id FROM user_repositories WHERE user_id = auth.uid()
        )
    );

-- Service role può gestire tutto (per webhook)
CREATE POLICY "Service role can manage repositories"
    ON repositories FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');
```

---

### Fase 2: Edge Function `git-sync`

#### 2.1 Modificare `addRepository()`

```typescript
async function addRepository(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  url: string,
  isPrivate: boolean = false,
  accessToken?: string
): Promise<Repository> {
  // 1. Controllare se il repository esiste già nel sistema
  const { data: existingRepo } = await supabase
    .from("repositories")
    .select("id, docora_repository_id")
    .eq("url", url)
    .single();

  if (existingRepo) {
    // Repository già esiste - collegare l'utente
    const { data: existingLink } = await supabase
      .from("user_repositories")
      .select("id")
      .eq("user_id", userId)
      .eq("repository_id", existingRepo.id)
      .single();

    if (existingLink) {
      throw new Error("Hai già aggiunto questo repository");
    }

    // Creare link utente-repository
    await supabase
      .from("user_repositories")
      .insert({ user_id: userId, repository_id: existingRepo.id });

    // Ritornare repository esistente
    return existingRepo;
  }

  // 2. Repository non esiste - crearlo e registrare su Docora
  const docoraRepo = await docoraAddRepository(url, accessToken);

  const { data: newRepo, error } = await supabase
    .from("repositories")
    .insert({
      url: url,
      name: docoraRepo.name,
      docora_repository_id: docoraRepo.repository_id,
      // NO user_id - repository condiviso
    })
    .select()
    .single();

  if (error) throw error;

  // 3. Creare link utente-repository
  await supabase
    .from("user_repositories")
    .insert({ user_id: userId, repository_id: newRepo.id });

  return newRepo;
}
```

#### 2.2 Modificare `deleteRepository()`

```typescript
async function deleteRepository(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  repositoryId: string
): Promise<void> {
  // 1. Rimuovere link utente-repository
  const { error: deleteError } = await supabase
    .from("user_repositories")
    .delete()
    .eq("user_id", userId)
    .eq("repository_id", repositoryId);

  if (deleteError) throw deleteError;

  // 2. Controllare se altri utenti hanno questo repository
  const { count } = await supabase
    .from("user_repositories")
    .select("*", { count: "exact", head: true })
    .eq("repository_id", repositoryId);

  // 3. Se nessun altro utente, eliminare repository e notificare Docora
  if (count === 0) {
    const { data: repo } = await supabase
      .from("repositories")
      .select("docora_repository_id")
      .eq("id", repositoryId)
      .single();

    if (repo?.docora_repository_id) {
      await docoraDeleteRepository(repo.docora_repository_id);
    }

    await supabase.from("repositories").delete().eq("id", repositoryId);
  }
}
```

#### 2.3 Modificare `getRepositories()` e `getStats()`

```typescript
async function getRepositories(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Repository[]> {
  const { data, error } = await supabase
    .from("user_repositories")
    .select(`
      repository:repositories(*)
    `)
    .eq("user_id", userId);

  if (error) throw error;
  return data?.map(d => d.repository) || [];
}

async function getStats(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ repositoryCount: number; cardCount: number }> {
  // Repository count
  const { count: repoCount } = await supabase
    .from("user_repositories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Card count (da repository dell'utente)
  const { data: repos } = await supabase
    .from("user_repositories")
    .select("repository_id")
    .eq("user_id", userId);

  if (!repos || repos.length === 0) {
    return { repositoryCount: 0, cardCount: 0 };
  }

  const repoIds = repos.map(r => r.repository_id);
  const { count: cardCount } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .in("repository_id", repoIds)
    .eq("is_active", true);

  return {
    repositoryCount: repoCount || 0,
    cardCount: cardCount || 0,
  };
}
```

---

### Fase 3: Edge Function `docora-webhook`

#### 3.1 Semplificare `findRepositoryByDocoraId()`

Con repository unici, `.single()` funziona sempre:

```typescript
async function findRepositoryByDocoraId(
  serviceClient: ReturnType<typeof createClient>,
  docoraRepositoryId: string
): Promise<LumioRepository | null> {
  const { data, error } = await serviceClient
    .from("repositories")
    .select("*")
    .eq("docora_repository_id", docoraRepositoryId)
    .single();  // ✅ Ora funziona sempre (1 repo per docora_id)

  if (error || !data) return null;
  return data;
}
```

#### 3.2 Aggiornare storage path immagini

```typescript
// PRIMA: {user_id}/{repo_id}/{path}
// DOPO:  {repo_id}/{path}

async function uploadImageToStorage(
  serviceClient: ReturnType<typeof createClient>,
  repoId: string,  // Rimosso userId
  originalPath: string,
  imageContent: Uint8Array,
  mimeType: string
): Promise<string> {
  const storagePath = `${repoId}/${originalPath}`;
  // ...
}
```

---

### Fase 4: Frontend Updates

#### 4.1 Packages `@lumio/shared`

```typescript
// types/index.ts
export interface Repository {
  id: string;
  url: string;
  name: string;
  description?: string;
  docoraRepositoryId?: string;
  formatVersion: number;
  syncStatus: SyncStatus;
  syncErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
  // RIMOSSO: userId - non più presente
}

export interface UserRepository {
  id: string;
  userId: string;
  repositoryId: string;
  createdAt: string;
}
```

#### 4.2 Packages `@lumio/core`

```typescript
// repositories.ts
export async function addRepository(
  url: string,
  isPrivate?: boolean,
  accessToken?: string
): Promise<Repository> {
  // Chiamata a git-sync rimane uguale
  // La logica di "già esiste" è gestita server-side
}

// Il resto delle funzioni rimane simile, solo mapRepository() cambia
```

#### 4.3 Web e Mobile

Nessuna modifica significativa al frontend - le API rimangono compatibili.

---

### Fase 5: Storage Migration

#### 5.1 Migrare file esistenti in Supabase Storage

```bash
# Script per rinominare i path
# Da: card-assets/{user_id}/{repo_id}/{path}
# A:  card-assets/{repo_id}/{path}
```

**Attenzione**: Questa migrazione deve essere coordinata con il deploy per evitare 404 sulle immagini.

---

## Ordine di Esecuzione

1. **Backup database** (critico)
2. **Deploy migration SQL** (crea `user_repositories`, migra dati, modifica constraints)
3. **Deploy Edge Functions** (git-sync, docora-webhook aggiornati)
4. **Migrare file Storage** (rinominare path)
5. **Deploy frontend** (se necessario)
6. **Test end-to-end**

---

## Rollback Plan

Se qualcosa va storto:

1. **Database**: Restore dal backup pre-migrazione
2. **Edge Functions**: Revert al commit precedente
3. **Storage**: I file non vengono eliminati, solo rinominati

---

## File da Modificare

| File | Modifiche |
|------|-----------|
| `supabase/migrations/YYYYMMDD_shared_repositories.sql` | NUOVO - migrazione completa |
| `supabase/functions/git-sync/index.ts` | Logica addRepository, deleteRepository, getStats |
| `supabase/functions/docora-webhook/index.ts` | Storage path, semplificazione lookup |
| `packages/shared/src/types/index.ts` | Tipo Repository (rimuovere userId) |
| `packages/core/src/supabase/repositories.ts` | mapRepository, query con join |
| `apps/web/src/pages/RepositoriesPage.tsx` | Minori (se necessario) |
| `apps/mobile/src/pages/RepositoriesPage.tsx` | Minori (se necessario) |
| `docs/DATA-MODEL.md` | Aggiornare schema |

---

## Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Perdita dati durante merge duplicati | Media | Alto | Backup + script di merge testato |
| 404 immagini durante migrazione | Alta | Medio | Deploy coordinato + redirect temporanei |
| RLS policies non corrette | Media | Alto | Test approfonditi pre-deploy |
| Edge Functions falliscono | Bassa | Alto | Rollback immediato disponibile |

---

## Timeline Stimata

| Fase | Tempo |
|------|-------|
| 1. Migration SQL | 2-3 ore |
| 2. git-sync refactor | 2-3 ore |
| 3. docora-webhook refactor | 1-2 ore |
| 4. Frontend updates | 1 ora |
| 5. Storage migration | 1 ora |
| 6. Testing | 2-3 ore |
| **Totale** | **~12 ore** |

---

## Domande Aperte

### Domanda: Gestione is_private per repository condivisi

Se Utente A aggiunge un repo privato con PAT, e Utente B aggiunge lo stesso repo pubblicamente:
- Il PAT di A è già su Docora
- B non ha bisogno di fornire PAT

**Proposta**: `is_private` diventa proprietà del repository (non dell'utente). Il primo che aggiunge determina se è privato.

---

## Prossimi Passi

1. ✅ Piano approvato
2. ✅ Implementazione migration SQL (`20260115000001_shared_repositories.sql`)
3. ✅ Implementazione Edge Functions (`git-sync`)
4. ✅ Testing locale (due utenti, stesso repository)
5. ⏳ Deploy production

---

## Scoperte Durante l'Implementazione

### RLS con Supabase JS Client in Edge Functions

Durante l'implementazione abbiamo scoperto un problema critico:

**Le RLS policies standard NON funzionano correttamente con il Supabase JS client nelle Edge Functions**, anche quando:
- `auth.uid()` ritorna un valore valido (verificato con funzioni di debug)
- L'utente è autenticato correttamente via `supabase.auth.getUser()`
- Le policies usano `WITH CHECK (true)` (sempre permissivo)

**Root Cause**: Il client Supabase JS nelle Edge Functions non propaga correttamente il contesto di autenticazione alle RLS policies per le operazioni INSERT, anche quando il token JWT è valido.

### Soluzione: SECURITY DEFINER Functions

Invece di usare direttamente le tabelle, abbiamo creato funzioni PostgreSQL `SECURITY DEFINER` che bypassano RLS in modo controllato:

```sql
-- Funzioni create in 20260115000001_shared_repositories.sql

CREATE OR REPLACE FUNCTION insert_repository(
    p_url TEXT,
    p_name TEXT,
    p_is_private BOOLEAN,
    p_docora_repository_id TEXT,
    p_format_version INTEGER,
    p_sync_status TEXT,
    p_sync_error_message TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypassa RLS, esegue come owner della funzione
AS $$...$$;

CREATE OR REPLACE FUNCTION insert_user_repository(p_user_id UUID, p_repository_id UUID) RETURNS json...
CREATE OR REPLACE FUNCTION check_user_repository_exists(p_user_id UUID, p_repository_id UUID) RETURNS boolean...
CREATE OR REPLACE FUNCTION find_repository_by_url(p_url TEXT) RETURNS json...
```

**Pattern di uso in Edge Functions**:

```typescript
// 1. Verificare autenticazione utente (sempre!)
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) throw new Error("Unauthorized");

// 2. Usare RPC functions invece di accesso diretto alle tabelle
const { data: existingRepo } = await supabase.rpc('find_repository_by_url', { p_url: url });

// 3. Passare user.id esplicitamente (non affidarsi a auth.uid() nelle policies)
await supabase.rpc('insert_user_repository', {
    p_user_id: user.id,
    p_repository_id: repo.id,
});
```

### Note sulla Migrazione

- **TRUNCATE CASCADE**: Poiché non siamo ancora in produzione, abbiamo usato `TRUNCATE repositories CASCADE` invece di migrare i dati esistenti
- **Storage paths**: Non è stata necessaria migrazione storage perché i dati sono stati cancellati
- **In produzione**: Sarà necessario uno script di migrazione dati prima di applicare la migration

---

## File Modificati (Effettivi)

| File | Modifiche |
|------|-----------|
| `supabase/migrations/20260115000001_shared_repositories.sql` | ✅ Migration completa con SECURITY DEFINER functions |
| `supabase/functions/git-sync/index.ts` | ✅ `addRepository()` usa RPC functions |
| `docs/DATA-MODEL.md` | ✅ Aggiornato schema e documentazione SECURITY DEFINER |
| `docs/PLAN-multi-user-repo-fix.md` | ✅ Documentazione completamento |

---

## Test Effettuati

1. **Utente A** (toto.castaldi@gmail.com): Aggiunto repository, cards sincronizzate
2. **Utente B** (antonio@skillbill.it): Aggiunto stesso repository
3. **Risultato**:
   - Database: 1 record in `repositories`, 2 record in `user_repositories`
   - Entrambi gli utenti vedono le stesse cards
   - Nessun errore webhook

