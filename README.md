![Shiko](public/images/shiko.jpg)

# Shiko - Intelligent Mind Mapping

Shiko (思考 - thinking) is an open-source intelligent mind mapping platform designed to help you organize your thoughts, cultivate ideas, and discover new connections within your knowledge.

## Overview

In a world of information overload, Shiko stands as your digital thinking canvas. It empowers you to organize chaos into clarity, transform scattered thoughts into structured knowledge, and unlock insights you never knew existed within your own ideas.

## Purpose

Shiko was created with a clear mission: to boost productivity and spark creativity by providing a flexible system where knowledge can grow organically. Unlike rigid organizational tools, Shiko adapts to your unique thinking patterns, allowing you to:

- Capture and connect ideas in your own unique way
- Discover unexpected relationships between concepts
- Transform information overload into accessible knowledge structures
- Augment your thinking with AI assistance that enhances rather than replaces human creativity

## Key Features

- **Interactive Mind Mapping**: Create visually engaging mind maps with intuitive node connections
- **AI-Powered Insights**: Generate map structures, summarize content, and extract key concepts
- **Semantic Search**: Find relevant information across your knowledge base using natural language
- **Custom Node Types**: Use specialized nodes for different types of information (tasks, questions, resources, annotations)
- **Collaboration Tools**: Real-time sharing and presence powered by PartyKit + Yjs
- **Responsive Design**: Access your mind maps from any device

## Technology Stack

Shiko is built using modern technologies:

- **Next.js & React**: For a fast, responsive frontend
- **TypeScript**: For type-safe code
- **Tailwind CSS**: For elegant, consistent styling
- **Supabase**: For authentication and database
- **OpenAI GPT**: For intelligent features

## Getting Started

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Set up environment variables (see `.env.example`)
4. Run Next.js in one terminal: `pnpm dev`
5. Run PartyKit in a second terminal: `pnpm party:dev`
6. Visit `http://localhost:3000` to start mapping

Local development runs PartyKit locally while Supabase can stay cloud-hosted. Keep JWT validation enabled in both local and production environments.
`pnpm party:dev` automatically sources `.env.local` before starting PartyKit.

Minimum realtime env values:

- `NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>`
- `SUPABASE_SERVICE_ROLE=<service-role-key>`
- `NEXT_PUBLIC_PARTYKIT_URL=127.0.0.1:1999`
- `NEXT_PUBLIC_PARTYKIT_PARTY=main`
- `PARTYKIT_BASE_URL=http://127.0.0.1:1999`
- `PARTYKIT_PARTY_NAME=main`
- `PARTYKIT_ADMIN_TOKEN=<random-secret>`
- `SUPABASE_JWKS_URL=<your-supabase-url>/auth/v1/.well-known/jwks.json` (optional override)
- `SUPABASE_JWT_ISSUER=<your-supabase-url>/auth/v1` (optional override)
- `SUPABASE_JWT_AUDIENCE=authenticated` (optional strict audience check)

If `SUPABASE_JWKS_URL` and `SUPABASE_JWT_ISSUER` are not set, PartyKit derives them from `NEXT_PUBLIC_SUPABASE_URL`.
Yjs graph transport and primary-write authority are now always enabled in the app runtime.

## E2E Testing

Playwright tests run against a production Next.js server started by the Playwright `webServer` config.

### First-time setup

1. Install browsers: `pnpm exec playwright install chromium`
2. Run tests: `pnpm e2e:chromium`

### If you hit startup/lock issues

- A stale `next build` can leave `.next/lock` and block new runs.
- Stop stale build processes, then re-run Playwright.

## Contributing

Shiko is an open-source project and we welcome contributions from the community. Whether you're fixing bugs, improving documentation, or proposing new features, your help is appreciated.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Vision

We believe that the best tools don't just organize what you already know—they help you discover what you don't. Shiko aims to be your thinking partner, helping you connect dots, spark new ideas, and make your knowledge more than the sum of its parts.

Join us in building a tool that makes thinking more productive, creative, and enjoyable.
