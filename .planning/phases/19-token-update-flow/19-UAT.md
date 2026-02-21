---
status: complete
phase: 19-token-update-flow
source: 19-01-SUMMARY.md
started: 2026-02-21T10:00:00Z
updated: 2026-02-21T18:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Tap repo fallito apre modale errore
expected: Tappando un repo fallito si apre un bottom-sheet (50% altezza) con dettagli errore (nome repo, tipo e messaggio errore)
result: pass

### 2. Auth error mostra input PAT
expected: Per un errore di tipo auth, il modale mostra un campo di testo per inserire un nuovo Personal Access Token e un pulsante di invio
result: pass

### 3. Errore non-auth mostra solo info
expected: Per un errore non-auth (es. errore di sistema), il modale mostra solo le informazioni dell'errore senza campo PAT
result: pass

### 4. Invio PAT valido cancella errore
expected: Dopo aver inserito un nuovo PAT e premuto invio, l'errore si cancella immediatamente, il modale si chiude, e la lista repo si aggiorna mostrando il repo senza indicatore di errore
result: pass
note: Toast errore correttamente mostrato con repo finto (Docora non disponibile). Happy path verificato via DB simulation + refresh — repo torna pulito.

### 5. Traduzioni IT/EN
expected: Tutti i testi del modale errore e token update sono tradotti correttamente in base alla lingua selezionata (IT o EN)
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
