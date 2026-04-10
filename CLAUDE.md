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

## Code Standards

- Language: TypeScript strict
- Comments: English
- Commits: English, conventional commits
- Tests: Vitest
- Linter: ESLint + Prettier
