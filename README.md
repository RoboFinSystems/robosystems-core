# @robosystems/core

[![npm version](https://badge.fury.io/js/@robosystems%2Fcore.svg)](https://www.npmjs.com/package/@robosystems/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**The shared frontend core of [RoboSystems](https://github.com/RoboFinSystems/robosystems), the open-source knowledge graph for finance.** `@robosystems/core` holds what [robosystems-app](https://github.com/RoboFinSystems/robosystems-app), [roboledger-app](https://github.com/RoboFinSystems/roboledger-app) and [roboinvestor-app](https://github.com/RoboFinSystems/roboinvestor-app) share: sign-in, the platform contexts, task monitoring and the UI component set. It is built for the Next.js App Router (client and server components, Server Actions) and ships as a versioned npm package.

## What it does

- **Authentication**: sign-in and sign-up forms, `AuthProvider` and `AuthGuard`, JWT and SSO token handling
- **Contexts**: graph, entity, organization, service-offering and sidebar state
- **Task monitoring**: SSE-based monitoring of long-running operations, with a polling fallback
- **UI components**: layout, chat, forms, settings, API keys, the shared Tailwind theme and the owned UI primitives (`@robosystems/core/ui`)
- **Docs rendering**: the docs catalog loader (`@robosystems/core/docs/catalog`) and the markdown renderer (`@robosystems/core/docs/DocsMarkdown`), server-side, for each app's `/docs`
- **Graph stage**: the landing pages' backdrop (`@robosystems/core/graph-stage`), a live clustered graph with dust, sphere orbs, galaxies, a grid floor and the `node-card` / `node-icon` styles, in each app's own colours
- **Hooks and utilities**: user, limits, toast and media-query hooks, and cookie persistence helpers

## Install

```bash
npm install @robosystems/core
```

Needs Node.js 24 or later. `react`, `react-dom`, `next`, `react-icons` and `@robosystems/client` are peer dependencies the consuming app provides. [CLAUDE.md](CLAUDE.md) covers the app wiring (the Tailwind content scan, vitest inlining), packaging and the release flow.

## Usage

Import from the root barrel, or from subpaths that mirror the folder structure:

```tsx
import { AuthProvider, useGraphContext } from '@robosystems/core'
import { Button, Modal } from '@robosystems/core/ui'
import { PageHeader, Spinner } from '@robosystems/core/ui-components'
import { useToast } from '@robosystems/core/hooks/use-toast'
import { getDocsCatalog } from '@robosystems/core/docs/catalog'
```

## Versioning

Pre-1.0: the API can change in a minor release, named in the [release notes](https://github.com/RoboFinSystems/robosystems-core/releases). The three apps move to a new version together, with [`@robosystems/report-components`](https://github.com/RoboFinSystems/robosystems-report-components) bumped in the same change.

## Documentation

- **Technical docs**: [robosystems.ai/docs/technical](https://robosystems.ai/docs/technical). For this package: [Local Development](https://robosystems.ai/docs/technical/local-development) · [Authentication & API Keys](https://robosystems.ai/docs/technical/authentication-and-api-keys)
- **Related**: [RoboSystems](https://github.com/RoboFinSystems/robosystems) · [robosystems-app](https://github.com/RoboFinSystems/robosystems-app) · [roboledger-app](https://github.com/RoboFinSystems/roboledger-app) · [roboinvestor-app](https://github.com/RoboFinSystems/roboinvestor-app) · [TypeScript client](https://github.com/RoboFinSystems/robosystems-typescript-client)

## Support

- [Issues](https://github.com/RoboFinSystems/robosystems-core/issues) · [Discussions](https://github.com/orgs/RoboFinSystems/discussions) · [Projects](https://github.com/orgs/RoboFinSystems/projects)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

MIT © 2026 RFS LLC
