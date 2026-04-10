# NodePress — CMS Platform

> WordPress-compatible content management platform built on Node.js

## Project Overview

- **Name:** NodePress
- **Goal:** CMS open-source compatible con el ecosistema WordPress (plugins, temas)
- **Stack:** Node.js, TypeScript, PostgreSQL, React (admin panel)
- **Status:** PoC / Proof of Concept

## Architecture Principles

- WordPress plugin API compatibility layer
- REST API compatible con WP REST API v2
- Hook system (actions + filters) idéntico al de WordPress
- Theme engine con soporte para templates PHP convertidos
- Admin panel moderno en React (no legacy WP admin)

## Execution Model

- **SIEMPRE delegar tareas a subagentes** usando la herramienta Agent. No ejecutar tareas directamente en el contexto principal.
- El orchestrator analiza, planifica y delega. Los subagentes ejecutan.
- Lanzar subagentes en paralelo cuando las tareas sean independientes.
- Cada subagente recibe un brief completo y autocontenido (no tiene contexto de la conversación).
- **Memorias se commitean con el trabajo.** Nunca separado, nunca después. `.claude/memory/` y `.claude/task_log.md` van en el mismo commit que el código.
- **Task log:** actualizar `.claude/task_log.md` (append-only) al completar cada tarea.

## Code Standards

- Language: TypeScript strict
- Comments: English
- Commits: English, conventional commits
- Tests: Vitest
- Linter: ESLint + Prettier
