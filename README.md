# @robosystems/core

Shared React components, hooks, contexts, and utilities for the RoboSystems ecosystem apps, published as an npm package.

[![npm](https://img.shields.io/npm/v/%40robosystems%2Fcore)](https://www.npmjs.com/package/@robosystems/core)

## Overview

This library contains the platform-coupled frontend core shared between:

- **robosystems-app** — Graph database management interface
- **roboledger-app** — Accounting and bookkeeping interface
- **roboinvestor-app** — Investment management interface

It is Next.js-specific by design (App Router client/server components, Server Actions, `next/headers` cookie helpers) and is intended to be consumed by Next.js applications only. The compiled output targets bundler resolution — it is not loadable by Node's native ESM resolver.

## Installation

```bash
npm install @robosystems/core
```

### Peer dependencies

The consuming app provides:

| Peer                  | Range      |
| --------------------- | ---------- |
| `react` / `react-dom` | >=18 <20   |
| `next`                | >=15 <17   |
| `flowbite-react`      | ^0.12.5    |
| `react-icons`         | >=4 <6     |
| `@robosystems/client` | >=0.3.2 <1 |

### App wiring

Two integration points beyond the install:

1. **Tailwind content scan** — the package ships Tailwind utility classes in its compiled JS; add it to the app's `tailwind.config.ts`:

   ```ts
   content: [
     // ...existing globs
     'node_modules/@robosystems/core/**/*.js',
   ]
   ```

2. **Vitest** (if the app tests components that render core) — the package is compiled ESM with directory imports and must be processed by vite, in `vitest.config.ts`:

   ```ts
   test: {
     server: { deps: { inline: [/@robosystems\/core/] } },
   }
   ```

## Usage

Everything is importable from the root barrel, or from subpaths mirroring the folder structure:

```typescript
import {
  AuthProvider,
  useAuth,
  useGraphContext,
  customTheme,
} from '@robosystems/core'
import { PageHeader, Spinner } from '@robosystems/core/ui-components'
import { useToast } from '@robosystems/core/hooks/use-toast'
```

> The root barrel has an import-time side effect: it configures the `@robosystems/client` SDK singleton (base URL from `NEXT_PUBLIC_ROBOSYSTEMS_API_URL`, Bearer-token request interceptor).

## Structure

```
├── actions/                  # Next.js Server Actions
│   ├── entity-actions.ts     # Entity creation and management
│   └── graph-actions.ts      # Graph creation and lifecycle
├── auth-components/          # Authentication UI components
│   ├── AppSwitcher.tsx       # Cross-app navigation switcher
│   ├── AuthGuard.tsx         # Route protection wrapper
│   ├── AuthProvider.tsx      # Authentication context provider
│   ├── SessionWarningDialog.tsx  # Session expiry warning
│   ├── SignInForm.tsx        # Login form
│   ├── SignUpForm.tsx        # Registration form
│   └── TurnstileWidget.tsx   # Cloudflare Turnstile CAPTCHA
├── auth-core/                # Authentication logic and types
│   ├── cleanup.ts            # Session cleanup utilities
│   ├── client.ts             # Authentication client
│   ├── config.ts             # Auth configuration
│   ├── hooks.ts              # useAuth and related hooks
│   ├── sso.ts                # SSO/OAuth support
│   ├── token-storage.ts      # JWT storage utilities
│   └── types.ts              # Auth TypeScript types
├── components/               # Shared UI components
│   ├── console/              # Terminal-style output display
│   ├── repositories/         # Repository browsing and subscriptions
│   ├── search/               # Search UI
│   ├── EntitySelector.tsx    # Entity picker component
│   ├── GraphSelectorCore.tsx # Graph picker component
│   ├── PageLayout.tsx        # Standard page layout
│   └── RepositoryGuard.tsx   # Repository access protection
├── contexts/                 # React contexts
│   ├── entity-context.tsx    # Active entity state
│   ├── graph-context.tsx     # Active graph state
│   ├── org-context.tsx       # Organization state
│   ├── service-offerings-context.tsx  # Available plans and tiers
│   └── sidebar-context.tsx   # Sidebar collapsed/expanded state
├── hooks/                    # Custom React hooks
│   ├── use-api-error.ts      # API error normalization
│   ├── use-media-query.ts    # Responsive breakpoint detection
│   ├── use-streaming-query.ts  # SSE streaming data hook
│   ├── use-toast.tsx         # Toast notification hook
│   ├── use-user-limits.ts    # User quota and limit checks
│   └── use-user.ts           # Current user data hook
├── lib/                      # Utility libraries
│   ├── entity-cookie.ts      # Entity selection persistence
│   ├── graph-cookie.ts       # Graph selection persistence
│   ├── graph-tiers.ts        # Tier display helpers
│   └── sidebar-cookie.ts     # Sidebar state persistence
├── library/                  # XBRL taxonomy browser
├── research/                 # Research coverage components
├── task-monitoring/          # Background job and operation tracking
│   ├── hooks.ts              # useTaskMonitoring, useEntityCreationTask
│   ├── operationErrors.ts    # Operation error types
│   ├── operationHooks.ts     # useOperationMonitoring, useGraphCreation
│   ├── operationMonitor.ts   # SSE-based operation monitor
│   ├── operationTypes.ts     # Shared operation types
│   ├── taskMonitor.ts        # Polling-based task monitor (fallback)
│   └── types.ts              # Task and operation TypeScript types
├── theme/                    # UI theming
│   └── flowbite-theme.ts     # Flowbite React custom theme
├── types/                    # Shared TypeScript definitions
│   ├── entity.d.ts           # Entity type definitions
│   └── user.d.ts             # User type definitions
├── ui-components/            # Reusable UI components
│   ├── api-keys/             # API key management
│   ├── chat/                 # Chat UI (header, input, messages, deep research toggle)
│   ├── forms/                # Form components and validation
│   ├── layout/               # Navbar, sidebar, page containers
│   ├── settings/             # Settings page components
│   ├── support/              # Support modal
│   ├── Logo.tsx              # RoboSystems logo component
│   └── Spinner.tsx           # Loading spinner
└── utils/                    # Utility functions
    └── turnstile-config.ts   # Cloudflare Turnstile configuration
```

## Technology Stack

- **React 18/19** with modern hooks and patterns
- **TypeScript** for type safety
- **Flowbite React** for UI components
- **Tailwind CSS** for styling (classes compiled by the consuming app)
- **Next.js 15/16** App Router
- **Auto-generated SDK** (`@robosystems/client`) from OpenAPI specifications

## Key Patterns

### Task Monitoring

Two monitors handle async operations:

- **`operationMonitor`** — SSE-based, used for graph lifecycle ops (create, materialize, etc.) that return `OperationEnvelope` with an `operationId`
- **`taskMonitor`** — Polling-based fallback for older task-style operations

```typescript
import { useOperationMonitoring, useGraphCreation } from '@robosystems/core/task-monitoring'

// Monitor a graph operation via SSE
const { startMonitoring, progress, result } = useOperationMonitoring()
await startMonitoring(operationId)

// Full graph creation with monitoring
const { createGraph, isCreating } = useGraphCreation()
await createGraph({ graph_type: 'entity', graph_name: 'Acme Corp', ... })
```

### Contexts

```typescript
import { useGraphContext, useOrgContext } from '@robosystems/core/contexts'

function MyComponent() {
  const { currentGraphId, setCurrentGraphId } = useGraphContext()
  const { org } = useOrgContext()
}
```

### Authentication

```typescript
import { useAuth, AuthProvider, AuthGuard } from '@robosystems/core/auth-core'
import { SignInForm, SignUpForm } from '@robosystems/core/auth-components'
```

## Development

```bash
npm install          # Also wires .githooks via the prepare script
npm run test         # Vitest suite (jsdom, app-equivalent mocks in test/__mocks__)
npm run test:all     # format:check + lint + typecheck + test + build
npm run build        # tsc → dist/ + prepare-package.mjs (publishable package root)
npm run pack:local   # Build + npm pack ./dist → tarball for local app testing
```

To test changes in an app before releasing:

```bash
npm run pack:local
cd ../roboledger-app && npm install ../robosystems-core/robosystems-core-<version>.tgz
```

### Packaging notes

- The package is published **from `dist/`** so compiled files sit at the package root — the apps' directory-barrel and direct-file deep imports both resolve without an `exports` map.
- The build is **per-file tsc** (not a bundler) so `'use client'` / `'use server'` directives survive at the top of each emitted file.
- **No CommonJS**: the output is ESM — `require()` is not available at runtime. Use static or dynamic `import`.

### Adding New Components

1. Create component in the appropriate directory
2. Add TypeScript types in `types/` if needed
3. Export from the directory's `index.ts` (and the root `index.ts` if broadly useful)
4. Add tests in the adjacent `__tests__/` directory
5. Validate in an app with a `pack:local` tarball before releasing

### Naming Conventions

- **Components**: PascalCase (`SidebarProvider`)
- **Hooks**: camelCase with `use` prefix (`useMediaQuery`)
- **Types**: PascalCase (`SidebarCookie`)
- **Utilities**: camelCase (`sidebarCookie`)

## Releasing

Releases run through GitHub Actions (same pipeline as `@robosystems/report-components`):

1. Run the **Create Release & Publish** workflow (`gh workflow run create-release.yml --field version_type=patch|minor|major`, or `npm run release:create`)
2. It bumps the version on `main`, cuts a `release/<version>` branch, tags `v<version>`, and creates a GitHub Release with an AI-generated changelog
3. The `release/**` push triggers `publish.yml`, which builds and runs `npm publish ./dist --provenance` via npm OIDC Trusted Publishing

## Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Follow authentication best practices
- Validate all inputs and API responses

## License

MIT
