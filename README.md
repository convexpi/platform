# convexpi/platform

The ConvexPi web platform — hosted grading, leaderboards, competition management, and instructor tooling.

Built with Next.js, Supabase, and Vercel. Requires [convexpi-lab](https://github.com/convexpi/lab) grader worker for strategy evaluation.

## Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres + Auth + Realtime)
- **Grader**: Python worker in `convexpi-lab` — polls Supabase, grades submissions in Docker sandbox
- **Deploy**: Vercel (web) + Railway (grader worker)

## Local development

```bash
cd web
cp .env.local.example .env.local   # fill in Supabase credentials
npm install
npm run dev
```

Run tests:

```bash
npm test          # unit tests (vitest)
npx playwright test  # e2e smoke tests
```

## License

MIT © Shane Conway
