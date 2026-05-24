# MentorSync

Real-time mentoring and accountability tracker for structured career transitions.

A mentor creates a phased learning plan, assigns it to a mentee, and both collaborate in real-time — tracking progress, flagging blockers, and exchanging comments on individual tasks.

## Features

- **Multi-role auth** — Mentor and Mentee roles with appropriate permissions
- **Dynamic plans** — Create any learning plan with phases, weeks, and tasks
- **Real-time sync** — Task status and comments update instantly across all connected clients
- **Blocker flagging** — One-click task blocking with visual alerts
- **Threaded comments** — Per-task messaging for guidance and troubleshooting
- **Progress tracking** — Global and per-phase completion percentages

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Auth & DB | Supabase (PostgreSQL + Realtime) |
| Icons | Lucide React |
| Deployment | Vercel |

All dependencies are open-source or free-tier.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/mentor-sync.git
cd mentor-sync

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
# Fill in your Supabase URL and keys
```

### Database Setup

1. Go to your Supabase project's SQL Editor
2. Run the migration file: `supabase/migrations/001_initial_schema.sql`
3. This creates all tables, indexes, RLS policies, and the auto-profile trigger

### Seed Data (Optional)

After creating a mentor account and a mentee account:

```bash
npm run seed
```

This inserts the sample 16-week Cloud Engineer plan.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login & signup pages
│   ├── (dashboard)/     # Authenticated dashboard & plan views
│   └── page.tsx         # Landing page
├── components/
│   ├── ui/              # Reusable UI primitives
│   ├── dashboard-shell  # App shell with sidebar
│   ├── phase-section    # Collapsible phase accordion
│   ├── week-section     # Weekend/Weekday task columns
│   ├── task-card        # Individual task with actions
│   └── comment-panel    # Slide-out comment thread
├── lib/
│   ├── supabase/        # Client, server, middleware configs
│   ├── hooks/           # Real-time subscription hooks
│   └── types/           # TypeScript type definitions
└── seed/                # Database seed scripts
```

## Extending

MentorSync is designed to be reusable:

- **New plans**: Any mentor can create plans with custom phases and tasks
- **Custom task types**: `weekend`, `weekday`, `milestone`, `full_focus` (extensible via DB constraint)
- **Multi-tenant**: Plan assignments support multiple mentees per plan
- **Role expansion**: Add new roles by updating the profiles CHECK constraint

## Deployment

Deploy to Vercel with zero configuration:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/mentor-sync)

Set environment variables in Vercel's dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## License

[MIT](./LICENSE)
