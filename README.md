# @robosystems/core

[![npm version](https://badge.fury.io/js/@robosystems%2Fcore.svg)](https://www.npmjs.com/package/@robosystems/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Shared React core for the RoboSystems ecosystem apps — authentication, platform contexts, task monitoring, and the common UI component set used by robosystems-app, roboledger-app, and roboinvestor-app. Built for the Next.js App Router (client/server components and Server Actions) and consumed as a versioned npm package.

## Features

- **Authentication** — sign-in/sign-up forms, `AuthProvider`/`AuthGuard`, JWT and SSO token handling
- **Contexts** — graph, entity, organization, service-offerings, and sidebar state
- **Task monitoring** — SSE-based operation monitoring with a polling fallback for long-running jobs
- **UI components** — layout, chat, forms, settings, API keys, and the shared Flowbite/Tailwind theme
- **Hooks & utilities** — user, limits, toast, and media-query hooks plus cookie persistence helpers

## Installation

```bash
npm install @robosystems/core
```

`react`, `react-dom`, `next`, `flowbite-react`, `react-icons`, and `@robosystems/client` are peer dependencies provided by the consuming app. See [CLAUDE.md](CLAUDE.md) for app wiring (Tailwind content scan, vitest inlining), packaging notes, and the release flow.

## Usage

Import from the root barrel or from subpaths mirroring the folder structure:

```tsx
import { AuthProvider, useGraphContext, customTheme } from '@robosystems/core'
import { PageHeader, Spinner } from '@robosystems/core/ui-components'
import { useToast } from '@robosystems/core/hooks/use-toast'
```

## Resources

- [RoboSystems Platform](https://robosystems.ai)
- [GitHub Repository](https://github.com/RoboFinSystems/robosystems-core)
- [API Documentation](https://api.robosystems.ai/docs)

## Support

- [Issues](https://github.com/RoboFinSystems/robosystems-core/issues)
- [Wiki](https://github.com/RoboFinSystems/robosystems/wiki)
- [Projects](https://github.com/orgs/RoboFinSystems/projects)
- [Discussions](https://github.com/orgs/RoboFinSystems/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

MIT © 2026 RFS LLC
