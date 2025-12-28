# Lumio Card Format Specification

**Versione Formato:** 1.0  
**Data:** 2025-12-28  
**Status:** Draft

---

## 1. Introduzione

Questo documento definisce il formato standard per i deck di flashcard compatibili con Lumio. I maintainer di repository che vogliono rendere i propri contenuti disponibili su Lumio devono seguire questa specifica.

### Principi Guida

- **Semplicità**: Il formato deve essere facile da creare e mantenere
- **Git-native**: Versioning e metadati derivano da Git quando possibile
- **Markdown-first**: Contenuti in puro Markdown per massima portabilità
- **Retrocompatibilità**: Versioni future del formato non romperanno i deck esistenti

---

## 2. Struttura Repository

### 2.1 Struttura Base

```
repository-root/
├── README.md              # Metadati del deck (OBBLIGATORIO)
├── assets/                # Immagini e risorse (opzionale)
│   └── img/
│       └── diagram.png
└── [cartelle libere]/     # Organizzazione a discrezione del maintainer
    └── *.md               # File card
```

### 2.2 Scansione Ricorsiva

Lumio scansiona **ricorsivamente** l'intera alberatura del repository cercando file `.md` validi (escluso `README.md`). La struttura delle cartelle è a beneficio del maintainer per organizzare i contenuti — Lumio la ignora ai fini della categorizzazione.

**Esempio**: Queste due strutture sono equivalenti per Lumio:

```
# Struttura A (flat)
/card-respirazione.md
/card-postura.md

# Struttura B (organizzata)
/fondamentali/respirazione.md
/fondamentali/postura.md
/avanzato/inversioni.md
```

---

## 3. README.md del Deck

Il file `README.md` nella root del repository è **obbligatorio** e deve contenere un frontmatter YAML con i metadati del deck.

### 3.1 Formato

```markdown
---
lumio_format_version: 1
description: "Descrizione breve del deck e del suo contenuto"
---

# Nome del Deck

Contenuto libero in Markdown. Può includere:
- Istruzioni per i contributori
- Spiegazione della struttura
- Licenza e attribuzioni
- Qualsiasi altra informazione utile
```

### 3.2 Campi Frontmatter

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `lumio_format_version` | integer | ✅ Sì | Versione della specifica Lumio seguita |
| `description` | string | ✅ Sì | Descrizione del deck (max 500 caratteri) |

### 3.3 Metadati Derivati da Git

I seguenti metadati vengono estratti automaticamente da Git e **non devono** essere specificati nel README:

| Metadato | Fonte |
|----------|-------|
| Nome deck | Nome del repository |
| Autore/Owner | Owner del repository Git |
| Versione | Commit hash / tag Git |
| Ultimo aggiornamento | Data ultimo commit |

---

## 4. Formato Card

Ogni card è un singolo file `.md` posizionato ovunque nel repository (esclusa la root per il README).

### 4.1 Struttura Card

```markdown
---
title: "Titolo del Concetto"
tags:
  - pilates
  - respirazione
  - fondamentali
difficulty: 2
language: it
---

Contenuto libero che spiega il concetto.

Può includere:
- Paragrafi di testo
- Liste
- Codice
- Immagini
- Link
- Qualsiasi Markdown valido
```

### 4.2 Campi Frontmatter Card

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|--------------|-------------|
| `title` | string | ✅ Sì | Titolo del concetto (visualizzato all'utente) |
| `tags` | string[] | ✅ Sì | Array di tag per categorizzazione e obiettivi |
| `difficulty` | integer | ❌ No | Difficoltà 1-5 (1=base, 5=avanzato). Default: 3 |
| `language` | string | ❌ No | Codice lingua ISO 639-1 (es. `it`, `en`). Default: `en` |

### 4.3 Identificativo Card

Ogni card riceve un **ID univoco** generato automaticamente da Lumio come hash del percorso completo:

```
card_id = hash(repository_url + "/" + relative_file_path)
```

**Esempio**:
- Repository: `https://github.com/user/pilates-deck`
- File: `fondamentali/respirazione.md`
- ID: `hash("https://github.com/user/pilates-deck/fondamentali/respirazione.md")`

> ⚠️ **Attenzione**: Rinominare o spostare un file card genera un nuovo ID, azzerando i progressi degli utenti su quella card.

### 4.4 Regole sui Tag

- Lowercase, senza spazi (usare `-` o `_` come separatore)
- Minimo 1 tag per card
- Nessun limite massimo, ma consigliati ≤ 10
- I tag servono per gli obiettivi utente ("voglio studiare `pilates`")

**Esempi validi**: `pilates`, `respirazione-base`, `livello_1`, `anatomia`  
**Esempi non validi**: `Pilates`, `respirazione base`, `Livello 1`

---

## 5. Immagini e Assets

### 5.1 Percorsi Relativi

Le immagini devono usare **percorsi relativi alla root del repository**:

```markdown
![Diagramma respirazione](/assets/img/respirazione.png)
```

Oppure relativi al file card:

```markdown
![Diagramma](../assets/img/respirazione.png)
```

### 5.2 Formati Supportati

| Formato | Estensioni | Note |
|---------|------------|------|
| PNG | `.png` | Consigliato per diagrammi |
| JPEG | `.jpg`, `.jpeg` | Consigliato per foto |
| GIF | `.gif` | Supportato, no animazioni |
| SVG | `.svg` | Consigliato per schemi |
| WebP | `.webp` | Supportato |

### 5.3 URL Esterni

Gli URL esterni sono supportati ma **sconsigliati** perché:
- Possono diventare non disponibili
- Non sono versionati con il repository
- Rallentano il caricamento

```markdown
<!-- Sconsigliato -->
![Immagine](https://example.com/image.png)

<!-- Consigliato -->
![Immagine](/assets/img/image.png)
```

---

## 6. Versioning del Formato

### 6.1 Compatibilità

Lumio supporta deck con `lumio_format_version` **minore o uguale** alla versione corrente dell'applicazione.

| Versione Lumio App | Formati Supportati |
|--------------------|-------------------|
| 1.x | 1 |
| 2.x (futuro) | 1, 2 |

### 6.2 Garanzie di Retrocompatibilità

Versioni future del formato:
- **Non rimuoveranno** campi obbligatori esistenti
- **Non cambieranno** il significato di campi esistenti
- **Potranno aggiungere** nuovi campi opzionali
- **Potranno aggiungere** nuovi campi obbligatori solo in major version

### 6.3 Migrazione

Quando viene rilasciata una nuova versione del formato, Lumio:
1. Continua a supportare le versioni precedenti
2. Fornisce documentazione per la migrazione
3. Può offrire tool di migrazione automatica

---

## 7. Validazione

### 7.1 Regole di Validazione

Lumio valida ogni deck al momento del sync. Una card è **valida** se:

1. ✅ È un file `.md` valido
2. ✅ Ha un frontmatter YAML valido
3. ✅ Contiene il campo `title` non vuoto
4. ✅ Contiene almeno un tag
5. ✅ `difficulty` (se presente) è un intero 1-5
6. ✅ `language` (se presente) è un codice ISO 639-1 valido

Un deck è **valido** se:

1. ✅ Esiste `README.md` nella root
2. ✅ Il README ha `lumio_format_version` supportato
3. ✅ Il README ha `description` non vuota
4. ✅ Almeno una card valida nel repository

### 7.2 Gestione Errori

| Errore | Comportamento Lumio |
|--------|---------------------|
| README mancante | Deck non importato |
| Versione non supportata | Deck non importato |
| Card con frontmatter invalido | Card ignorata, warning |
| Card senza tag | Card ignorata, warning |
| Immagine non trovata | Card importata, immagine non mostrata |

---

## 8. Esempi Completi

### 8.1 README.md

```markdown
---
lumio_format_version: 1
description: "Deck completo per lo studio del Pilates mat work, dai fondamentali agli esercizi avanzati."
---

# Pilates Mat Work

Questo deck copre tutti i concetti fondamentali del Pilates a corpo libero.

## Struttura

- `/fondamentali/` - Concetti base (respirazione, postura, core)
- `/esercizi-base/` - I 10 esercizi per principianti
- `/esercizi-avanzati/` - Progressioni e varianti

## Contribuire

Apri una PR! Assicurati che ogni card abbia almeno i tag appropriati.

## Licenza

CC BY-SA 4.0
```

### 8.2 Card Semplice

```markdown
---
title: "Respirazione Laterale"
tags:
  - pilates
  - respirazione
  - fondamentali
difficulty: 1
language: it
---

La respirazione laterale (o costale) è la tecnica di respirazione fondamentale nel Pilates.

## Principio

Durante l'inspirazione, le costole si espandono lateralmente mantenendo l'addome leggermente contratto. Questo permette di:

- Mantenere l'attivazione del core durante il movimento
- Evitare la respirazione addominale che rilassa i muscoli profondi
- Aumentare la capacità polmonare

## Esecuzione

1. Posiziona le mani sui lati delle costole
2. Inspira dal naso, sentendo le costole espandersi contro le mani
3. Espira dalla bocca, sentendo le costole tornare verso il centro
4. Mantieni l'ombelico leggermente retratto per tutta la durata
```

### 8.3 Card con Immagine

```markdown
---
title: "Posizione Neutra del Bacino"
tags:
  - pilates
  - postura
  - fondamentali
  - allineamento
difficulty: 2
language: it
---

La posizione neutra del bacino è il punto di partenza per la maggior parte degli esercizi Pilates.

![Posizione neutra vs imprint](/assets/img/posizione-neutra.png)

## Come Trovarla

In posizione supina, il bacino è neutro quando:

- Le spine iliache anteriori (ASIS) e il pube sono sullo stesso piano orizzontale
- C'è una leggera curva lombare naturale (non appiattita)
- Il triangolo formato da ASIS e pube è parallelo al pavimento
```

---

## 9. Checklist per Maintainer

Prima di pubblicare un deck compatibile con Lumio:

- [ ] `README.md` presente nella root con frontmatter valido
- [ ] `lumio_format_version: 1` specificato
- [ ] `description` compilata (max 500 caratteri)
- [ ] Ogni card ha `title` e almeno un `tag`
- [ ] Tag in lowercase senza spazi
- [ ] Immagini con percorsi relativi
- [ ] Immagini effettivamente presenti nel repository
- [ ] Testato con il validatore Lumio (quando disponibile)

---

## 10. Changelog

### Versione 1.0 (2025-12-28)
- Release iniziale
- Supporto card Markdown con frontmatter YAML
- Campi: `title`, `tags`, `difficulty`, `language`
- Immagini con percorsi relativi

---

*Specifica mantenuta dal team Lumio. Per suggerimenti o chiarimenti, aprire una issue sul repository principale.*
