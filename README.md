# @robosystems/core

[![npm version](https://badge.fury.io/js/@robosystems%2Fcore.svg)](https://www.npmjs.com/package/@robosystems/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Part of RoboSystems, the open-source knowledge graph for finance. Shared React core for the RoboSystems apps: authentication, platform contexts, task monitoring, and the common UI component set used by robosystems-app, roboledger-app, and roboinvestor-app. Built for the Next.js App Router (client/server components and Server Actions) and consumed as a versioned npm package.

## Features

- **Authentication** — sign-in/sign-up forms, `AuthProvider`/`AuthGuard`, JWT and SSO token handling
- **Contexts** — graph, entity, organization, service-offerings, and sidebar state
- **Task monitoring** — SSE-based operation monitoring with a polling fallback for long-running jobs
- **UI components** — layout, chat, forms, settings, API keys, and the shared Tailwind theme and the owned UI primitives (`@robosystems/core/ui`)
- **Docs rendering** — the docs catalog loader (`@robosystems/core/docs/catalog`) and the markdown renderer (`@robosystems/core/docs/DocsMarkdown`), server-side, for each app's `/docs`
- **Graph stage** — the landing pages' backdrop (`@robosystems/core/graph-stage`): a live clustered graph, dust, sphere orbs, galaxies, a grid floor and the `node-card` / `node-icon` styles, in each app's own colours
- **Hooks & utilities** — user, limits, toast, and media-query hooks plus cookie persistence helpers

## Installation

```bash
npm install @robosystems/core
```

`react`, `react-dom`, `next`, `react-icons`, and `@robosystems/client` are peer dependencies provided by the consuming app. See [CLAUDE.md](CLAUDE.md) for app wiring (Tailwind content scan, vitest inlining), packaging notes, and the release flow.

## Usage

Import from the root barrel or from subpaths mirroring the folder structure:

```tsx
import { AuthProvider, useGraphContext } from '@robosystems/core'
import { Button, Modal } from '@robosystems/core/ui'
import { PageHeader, Spinner } from '@robosystems/core/ui-components'
import { useToast } from '@robosystems/core/hooks/use-toast'
import { getDocsCatalog } from '@robosystems/core/docs/catalog'
```

## Resources

- [RoboSystems Platform](https://robosystems.ai)
- [GitHub Repository](https://github.com/RoboFinSystems/robosystems-core)
- [API Reference](https://robosystems.ai/docs/api)

## Support

- [Issues](https://github.com/RoboFinSystems/robosystems-core/issues)
- [Documentation](https://robosystems.ai/docs/technical)
- [Projects](https://github.com/orgs/RoboFinSystems/projects)
- [Discussions](https://github.com/orgs/RoboFinSystems/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

MIT © 2026 RFS LLC
