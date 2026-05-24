# Contributing to MentorSync

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
4. Run the migration in your Supabase SQL Editor
5. Start the dev server: `npm run dev`

## Code Style

- TypeScript strict mode — no `any` types
- Functional components with hooks
- Tailwind CSS for styling (no CSS modules or styled-components)
- Keep components small and focused

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Ensure `npm run build` passes without errors
4. Open a PR with a description of what you changed and why

## Reporting Issues

Open a GitHub Issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information if relevant

## Architecture Decisions

- **No external state management** — Supabase realtime + React state is sufficient
- **Server Components by default** — Only use `"use client"` when interactivity is needed
- **RLS over API middleware** — Security is enforced at the database level
