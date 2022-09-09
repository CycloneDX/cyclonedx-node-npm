/*!
This file is part of CycloneDX generator for NPM projects.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

import { Builders, Enums, Factories, Models } from '@cyclonedx/cyclonedx-library'
import { spawnSync } from 'child_process'
import { existsSync } from 'fs'
import { PackageURL } from 'packageurl-js'
import { dirname, resolve } from 'path'

import { PropertyNames, PropertyValueBool } from './properties'
import { makeThisTool } from './thisTool'

type OmittableDependencyTypes = 'dev' | 'optional' | 'peer'

interface BomBuilderOptions {
  ignoreNpmErrors?: BomBuilder['ignoreNpmErrors']
  metaComponentType?: BomBuilder['metaComponentType']
  packageLockOnly?: BomBuilder['packageLockOnly']
  omitDependencyTypes?: Iterable<OmittableDependencyTypes>
  reproducible?: BomBuilder['reproducible']
  flattenComponents?: BomBuilder['flattenComponents']
}

interface SpawnSyncResultError extends Error {
  errno?: number
  code?: string
  signal?: NodeJS.Signals
}

type cPath = string
type AllComponents = Map<cPath, Models.Component>

export class BomBuilder {
  toolBuilder: Builders.FromNodePackageJson.ToolBuilder
  componentBuilder: Builders.FromNodePackageJson.ComponentBuilder
  treeBuilder: TreeBuilder
  purlFactory: Factories.FromNodePackageJson.PackageUrlFactory

  ignoreNpmErrors: boolean

  metaComponentType: Enums.ComponentType | undefined
  packageLockOnly: boolean
  omitDependencyTypes: Set<OmittableDependencyTypes>
  reproducible: boolean
  flattenComponents: boolean

  console: Console

  /**
   * Matches the filename for the npx cli script in a given path:
   *
   * Matches:
   *   - npx-cli.js     // plain
   *   - foo/npx-cli.js // unix-like paths
   *   - foo\npx-cli.js // windows-like paths
   *
   * Does not match:
   *   - foobar/            // Not the filename
   *   - foobar-npx-cli.js  // Invalid leading string
   *   - foo/npx-cli_js     // Invalid extension
   *   - npx-cli.js/foo.sh  // Directory of the same name
   */
  private readonly npxMatcher = /(^|\\|\/)npx-cli\.js$/g

  constructor (
    toolBuilder: BomBuilder['toolBuilder'],
    componentBuilder: BomBuilder['componentBuilder'],
    treeBuilder: BomBuilder['treeBuilder'],
    purlFactory: BomBuilder['purlFactory'],
    options: BomBuilderOptions,
    console_: BomBuilder['console']
  ) {
    this.toolBuilder = toolBuilder
    this.componentBuilder = componentBuilder
    this.treeBuilder = treeBuilder
    this.purlFactory = purlFactory

    this.ignoreNpmErrors = options.ignoreNpmErrors ?? false
    this.metaComponentType = options.metaComponentType
    this.packageLockOnly = options.packageLockOnly ?? false
    this.omitDependencyTypes = new Set(options.omitDependencyTypes ?? [])
    this.reproducible = options.reproducible ?? false
    this.flattenComponents = options.flattenComponents ?? false

    this.console = console_
  }

  buildFromLockFile (filePath: string, process: NodeJS.Process): Models.Bom {
    return this.buildFromNpmLs(
      this.fetchNpmLs(
        dirname(filePath),
        process
      )
    )
  }

  private getNpmCommand (process: NodeJS.Process): string {
    // `npm_execpath` will be whichever cli script has called this application by npm.
    // This can be `npm`, `npx`, or `undefined` if called by `node` directly.
    const execPath = process.env.npm_execpath ?? ''

    if (this.npxMatcher.test(execPath)) {
      // `npm` must be used for executing `ls`.
      this.console.debug('DEBUG | command: npx-cli.js usage detected, checking for npm-cli.js ...')
      // Typically `npm-cli.js` is alongside `npx-cli.js`, as such we attempt to use this and validate it exists.
      // Replace the script in the path, and normalise it with resolve (eliminates any extraneous path separators).
      const npmPath = resolve(execPath.replace(this.npxMatcher, '$1npm-cli.js'))

      return existsSync(npmPath)
        ? npmPath // path detected
        : 'npm' // fallback to global npm
    }

    /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions -- need to handle optional empty-string */
    return execPath || 'npm'
  }

  private fetchNpmLs (projectDir: string, process: NodeJS.Process): any {
    let command: string = this.getNpmCommand(process)
    const args: string[] = [
      'ls',
      // format as parsable json
      '--json',
      // depth = infinity
      '--all',
      // get all the needed content
      '--long'
    ]
    if (this.packageLockOnly) {
      args.push('--package-lock-only')
    }
    for (const odt of this.omitDependencyTypes) {
      args.push('--omit', odt)
    }
    if (command.endsWith('.js')) {
      args.unshift('--', command)
      command = process.execPath
    }

    // TODO use instead ? : https://www.npmjs.com/package/debug ?
    this.console.info('INFO  | gather dependency tree ...')
    this.console.debug('DEBUG | npm-ls: run %s with %j in %s', command, args, projectDir)
    const npmLsReturns = spawnSync(command, args, {
      // must use a shell for Windows systems in order to work
      shell: true,
      cwd: projectDir,
      env: process.env,
      encoding: 'buffer',
      maxBuffer: Number.MAX_SAFE_INTEGER // DIRTY but effective
    })
    /*
    if (npmLsReturns.stdout?.length > 0) {
      this.console.group('DEBUG | npm-ls: STDOUT')
      this.console.debug('%s', npmLsReturns.stdout)
      this.console.groupEnd()
    } else {
      this.console.debug('DEBUG | npm-ls: no STDOUT')
    }
    */
    if (npmLsReturns.stderr?.length > 0) {
      this.console.group('WARN  | npm-ls: STDERR')
      this.console.warn('%s', npmLsReturns.stderr)
      this.console.groupEnd()
    } else {
      this.console.debug('DEBUG | npm-ls: no STDERR')
    }
    if (npmLsReturns.status !== 0 || npmLsReturns.error instanceof Error) {
      const error = npmLsReturns.error as SpawnSyncResultError ?? {}
      this.console.group('ERROR | npm-ls: errors')
      this.console.error('%j', { error, status: npmLsReturns.status, signal: npmLsReturns.signal })
      this.console.groupEnd()
      if (this.ignoreNpmErrors) {
        this.console.debug('DEBUG | npm-ls exited with errors that are to be ignored.')
      } else {
        throw new Error(`npm-ls exited with errors: ${
          error.errno ?? '???'} ${
          error.code ?? npmLsReturns.status ?? 'noCode'} ${
          error.signal ?? npmLsReturns.signal ?? 'noSignal'}`)
      }
    }

    try {
      return JSON.parse(npmLsReturns.stdout.toString())
    } catch (jsonParseError) {
      // @ts-expect-error TS2554
      throw new Error('failed to parse npm-ls response', { cause: jsonParseError })
    }
  }

  buildFromNpmLs (data: any): Models.Bom {
    // TODO use instead ? : https://www.npmjs.com/package/debug ?
    this.console.info('INFO  | build BOM ...')

    // region all components & dependencies

    const rootComponent = this.makeComponent(data, this.metaComponentType) ??
      new DummyComponent(Enums.ComponentType.Library, 'RootComponent')
    const allComponents: AllComponents = new Map([[data.path, rootComponent]])
    this.gatherDependencies(allComponents, data, rootComponent.dependencies)

    // endregion all components & dependencies

    const bom = new Models.Bom()

    // region metadata

    bom.metadata.component = rootComponent

    const thisTool = makeThisTool(this.toolBuilder)
    if (thisTool !== undefined) {
      bom.metadata.tools.add(thisTool)
    }

    if (!this.reproducible) {
      bom.metadata.timestamp = new Date()
    }

    // endregion metadata

    // region components

    bom.components = this.nestComponents(
      // remove rootComponent - so the elements that are nested below it are just returned.
      new Map(Array.from(allComponents.entries()).filter(([, c]) => c !== rootComponent)),
      this.treeBuilder.fromPaths(
        new Set(allComponents.keys()),
        // do not depend on `path.sep` -- this would be runtime-dependent, not input-dependent
        data.path[0] === '/' ? '/' : '\\'
      )
    )
    bom.components.forEach(c => this.adjustNestedBomRefs(c, ''))
    rootComponent.components.clear()

    if (this.flattenComponents) {
      for (const component of allComponents.values()) {
        component.properties.forEach(p => {
          if (p.name === PropertyNames.PackageBundled) {
            // bundle-markers have no value when components are flattened, because it is impossible to identify where a component was bundled into.
            component.properties.delete(p)
          }
        })
        component.components.clear()
        if (component !== rootComponent) {
          bom.components.add(component)
        }
      }
    }

    // endregion components

    return bom
  }

  private adjustNestedBomRefs (component: Models.Component, pref: string): void {
    if (component.bomRef.value === undefined) {
      return
    }
    component.bomRef.value = pref + component.bomRef.value
    const fill = component.bomRef.value + '|'
    component.components.forEach(c => this.adjustNestedBomRefs(c, fill))
  }

  private nestComponents (allComponents: AllComponents, tree: PTree): Models.ComponentRepository {
    const children = new Models.ComponentRepository()
    for (const [p, pTree] of tree) {
      const component = allComponents.get(p)
      const components = this.nestComponents(allComponents, pTree)
      if (component === undefined) {
        components.forEach(c => children.add(c))
      } else {
        component.components = components
        children.add(component)
      }
    }
    return children
  }

  private gatherDependencies (allComponents: AllComponents, data: any, directDepRefs: Set<Models.BomRef>): void {
    /* One and the same component may appear multiple times in the tree,
     * but only one occurrence has all the direct dependencies.
     * So we work only on the one `data` that actually has dependencies.
     */
    /* One and the same component may appear multiple times in the tree,
     * but only the most top-level has a complete set with all `dependencies` *and* `resolved`.
     * This detail might cause implementation changes: run over the top level first, then go into nested dependencies.
     */
    for (const [depName, depData] of Object.entries(data.dependencies ?? {}) as any) {
      if (depData === null || typeof depData !== 'object') {
        continue
      }
      if (typeof depData.path !== 'string') {
        // might be an optional dependency that was not installed
        continue
      }

      let dep = allComponents.get(depData.path)
      if (dep === undefined) {
        dep = this.makeComponent(
          this.packageLockOnly
            ? depData
            : this.enhancedPackageData(depData)
        ) ?? new DummyComponent(Enums.ComponentType.Library, `InterferedDependency.${depName as string}`)
        allComponents.set(depData.path, dep)
      }
      directDepRefs.add(dep.bomRef)

      this.gatherDependencies(allComponents, depData, dep.dependencies)
    }
  }

  /**
   * Some combinations/versions of `npm-install`/`npm-ls` are insufficient,
   * they fail to load package details or miss details.
   * So here is a poly-fill that loads ALL the package's data.
   */
  private enhancedPackageData (data: { path: string }): any {
    try {
      return Object.assign(
        /* eslint-disable-next-line @typescript-eslint/no-var-requires */
        require(`${data.path}/package.json`),
        data
      )
    } catch {
      return data
    }
  }

  /**
   * base64 over 512 bit => 86 chars + 2 chars padding
   */
  private readonly hashRE_sha512_base64 = /\bsha512-([a-z0-9+/]{86}==)\b/i

  /**
   * Ignore pattern for `resolved`.
   * - ignore: well, just ignore it ... i guess.
   * - file: local dist cannot be shipped and therefore should be ignored.
   */
  private readonly resolvedRE_ignore = /^(?:ignore|file):/i

  private makeComponent (data: any, type?: Enums.ComponentType | undefined): Models.Component | undefined {
    const component = this.componentBuilder.makeComponent(data, type)
    if (component === undefined) {
      return undefined
    }

    // older npm-ls versions (v6) hide properties behind a `_`
    if ((data.dev ?? data._development) === true) {
      if (this.omitDependencyTypes.has('dev')) {
        return undefined
      }
      component.properties.add(
        new Models.Property(PropertyNames.PackageDevelopment, PropertyValueBool.True)
      )
    }

    if (data.extraneous === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageExtraneous, PropertyValueBool.True)
      )
    }

    if (data.private === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackagePrivate, PropertyValueBool.True)
      )
    }

    // older npm-ls versions (v6) hide properties behind a `_`
    if (!this.flattenComponents && (data.inBundle ?? data._inBundle) === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageBundled, PropertyValueBool.True)
      )
    }

    // older npm-ls versions (v6) hide properties behind a `_`
    const resolved = data.resolved ?? data._resolved
    if (typeof resolved === 'string' && !this.resolvedRE_ignore.test(resolved)) {
      component.externalReferences.add(
        new Models.ExternalReference(
          resolved,
          Enums.ExternalReferenceType.Distribution,
          { comment: 'as detected from npm-ls property "resolved"' }
        )
      )
    }

    // older npm-ls versions (v6) hide properties behind a `_`
    const integrity = data.integrity ?? data._integrity
    if (typeof integrity === 'string') {
      const hashSha512Match = this.hashRE_sha512_base64.exec(integrity) ?? []
      if (hashSha512Match?.length === 2) {
        component.hashes.set(
          Enums.HashAlgorithm['SHA-512'],
          Buffer.from(hashSha512Match[1], 'base64').toString('hex')
        )
      }
    }

    // even private packages may have a PURL for identification
    component.purl = this.makePurl(component)

    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- since empty-string handling is needed */
    component.bomRef.value = (typeof data._id === 'string' ? data._id : undefined) ||
      /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing -- since empty-string handling is needed */
      `${component.group || '-'}/${component.name}@${component.version || '-'}`

    return component
  }

  private makePurl (component: Models.Component): PackageURL | undefined {
    const purl = this.purlFactory.makeFromComponent(component, this.reproducible)
    if (purl === undefined) {
      return undefined
    }

    /* @TODO: detect non-standard registry (not "npmjs.org")
       const qualifiers: PackageURL['qualifiers'] = purl.qualifiers ?? {}
       qualifiers.repository_url = ...
     */

    return purl
  }
}

class DummyComponent extends Models.Component {
  constructor (type: Models.Component['type'], name: Models.Component['name']) {
    super(type, `DummyComponent.${name}`, {
      bomRef: `DummyComponent.${name}`,
      description: `This is a dummy component "${name}" that fills the gap where the actual built failed.`
    })
  }
}

type PTree = Map<string, PTree>

export class TreeBuilder {
  fromPaths (paths: Set<string>, dirSeparator: string): PTree {
    const tree: PTree = new Map(Array.from(paths, p => [p + dirSeparator, new Map()]))
    this.nestPT(tree)
    this.renderPR(tree, '')
    return tree
  }

  private renderPR (tree: PTree, pref: string): void {
    for (const [p, pTree] of [...tree.entries()]) {
      tree.delete(p)
      const pFull = pref + p
      this.renderPR(pTree, pFull)
      tree.set(pFull.slice(undefined, -1), pTree)
    }
  }

  private nestPT (tree: PTree): void {
    if (tree.size < 2) {
      // nothing to compare ...
      return
    }
    for (const a of tree.keys()) {
      for (const [b, bTree] of tree) {
        if (a === b) {
          continue
        }
        if (b.startsWith(a)) {
          (tree.get(a) as PTree).set(b.slice(a.length), bTree)
          tree.delete(b)
        }
      }
    }
    for (const c of tree.values()) {
      this.nestPT(c)
    }
  }
}
