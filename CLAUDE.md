# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Production**: https://lumio.toto-castaldi.com/

## Documentation

- [Vision, problema, utenti, funzionalità v1, metriche di successo](./docs/PRD.md)
- [Formato Markdown delle card, struttura repository, validazione](./docs/CARD-FORMAT-SPEC.md)
- [Monorepo, stack, Supabase, CI/CD, deploy, monitoring](./docs/TECHNICAL-ARCHITECTURE.md)
- [Onboarding, studio, obiettivi, repository, notifiche](./docs/USER-FLOWS.md)
- [Schema PostgreSQL, entità, relazioni, RLS policies](./docs/DATA-MODEL.md)
- [Roadmap](./docs/ROADMAP.md)

## Configuration Files

- [Nginx virtual host](./conf/nginx-lumio.conf) - Configurazione Nginx per `lumio.toto-castaldi.com`


## Rules

- **Never execute git commands.** The user handles all git operations (commit, push, pull, etc.) manually.
- **SQL migrations must never cause data loss.** Never use DROP COLUMN, DROP TABLE, or destructive operations without migrating data first. Always preserve existing data with ALTER TABLE ADD COLUMN, data migration scripts, and only then remove old columns if needed.
- **Add new Edge Functions to GitHub Action.** When creating a new Edge Function, always add it to `.github/workflows/deploy.yml` in the "Deploy Edge Functions" step.
- **Use frontend-design plugin** When you do a UX/UI task, use the installed Frontend-design plugin.