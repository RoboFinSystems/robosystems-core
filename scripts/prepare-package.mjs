/**
 * Assembles a publishable package in dist/ after tsc emit.
 *
 * The package is packed/published FROM dist/ (npm pack ./dist) so compiled
 * files sit at the package root. That keeps every deep-import specifier the
 * apps already use (e.g. `@robosystems/core/ui-components`,
 * `@robosystems/core/hooks/use-toast`) resolvable by plain bundler file
 * resolution — no exports-map wildcards, which cannot serve both
 * directory-barrel and direct-file subpaths at once.
 */
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

const root = JSON.parse(readFileSync('package.json', 'utf8'))

const pkg = {
  name: root.name,
  version: root.version,
  description: root.description,
  license: root.license,
  // `private` is inherited from the root manifest: flip it there when this
  // package is ready to publish, and dist/ follows.
  private: root.private,
  type: root.type,
  main: './index.js',
  types: './index.d.ts',
  // The root barrel configures the @robosystems/client SDK at import time
  // (setConfig + auth interceptor) — it must survive tree-shaking.
  sideEffects: ['./index.js'],
  repository: root.repository,
  publishConfig: root.publishConfig,
  engines: root.engines,
  dependencies: root.dependencies,
  peerDependencies: root.peerDependencies,
}

writeFileSync(join('dist', 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

copyFileSync('README.md', join('dist', 'README.md'))
copyFileSync('LICENSE', join('dist', 'LICENSE'))

// tsc does not emit input .d.ts files (types/entity.d.ts, types/user.d.ts),
// but dist/types/index.d.ts re-exports from them — copy them over.
mkdirSync(join('dist', 'types'), { recursive: true })
for (const f of readdirSync('types')) {
  if (f.endsWith('.d.ts')) {
    copyFileSync(join('types', f), join('dist', 'types', f))
  }
}

console.log(`Prepared dist/ for ${pkg.name}@${pkg.version}`)
